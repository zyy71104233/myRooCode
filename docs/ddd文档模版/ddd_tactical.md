---
description:
globs:
alwaysApply: false
---

# 限界上下文战术设计 - [限界上下文名称]

_AI指令：本文档是针对一个特定限界上下文的详细设计。你的任务是基于战略设计文档中对此上下文的定义，填充所有细节。请严格遵循每个章节的引导和AI原则，用精确、无歧义的语言描述模型。你的输出必须同时服务于代码实现和架构评审。_

**AI核心原则**

- **YAGNI (You Ain't Gonna Need It)**: 始终选择能满足当前需求的最简方案。除非业务复杂性明确要求，否则**禁止**主动引入CQRS、事件溯源、状态机、消息队列等复杂模式。
- **极致简洁**: 质疑任何非必要的抽象层、接口或间接调用。优先选择具体实现，仅在出现**明确的、重复的模式**或**需要替换实现**时才进行抽象。

---

## **1. 上下文概述与通用语言 (Context Overview & Ubiquitous Language)**

### **1.1 战略承接 (Strategic Alignment)**

- **承载的子域**: `支撑域：订单与交易管理`
- **子域类型**: `支撑域`
- **核心战略职责**:
    > 保护交易流程的完整性与一致性。负责从用户确认购买意向（下单）开始，到生成一个不可变的、已支付的订单为止的全过程。
- **上下文边界 (Context Boundary)**:
    > 本上下文**不负责**以下业务：
    >
    > - 商品信息管理（如价格、描述、类目）。
    > - 库存的底层扣减与管理。
    > - 用户身份认证与会话管理。
    > - 具体的支付网关集成与扣款执行。

### **1.2 通用语言 (Ubiquitous Language)**

> _列出此上下文内部使用的、具有精确含义的核心术语。_

| 术语 (Term)            | 在本上下文中的精确定义                                                                           | 备注/反模式警告                                                         |
| :--------------------- | :----------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **订单 (Order)**       | 代表一次客户交易的**快照**。它封装了商品、价格、收货地址等。一旦提交，其核心内容即为**不可变**。 | **警告**: 避免在`Order`上添加与其核心交易快照无关的行为，如“申请售后”。 |
| **下单 (Place Order)** | 将购物意向转化为一个待支付订单的**业务动作**。这是交易生命周期的起点。                           | 这是`CreateOrder`的业务术语。                                           |
| **冻结价格**           | 订单项中记录的商品价格。它取自下单瞬间的商品价格，**不随**商品价格的后续调整而改变。             | 这是保证交易快照不变性的关键。                                          |

---

## **2. 需求映射：从用户故事到用例 (Requirement Mapping: User Stories to Use Cases)**

| 用户故事ID | 故事标题               | 关联的应用层操作                                              | 触发的主要领域事件 |
| :--------- | :--------------------- | :------------------------------------------------------------ | :----------------- |
| `US-101`   | 用户下单               | **用例**: `OrderApplicationService.PlaceOrder`                | `OrderPlaced`      |
| `US-102`   | 用户支付订单           | **用例**: `OrderApplicationService.HandlePaymentConfirmation` | `OrderPaid`        |
| `US-201`   | 用户查看订单详情       | **查询**: `OrderQueryService.GetOrderDetails`                 | (无)               |
| `US-202`   | 用户查看自己的订单列表 | **查询**: `OrderQueryService.ListOrdersForUser`               | (无)               |

---

## **3. 全局技术规约 (Global Technical Specifications)**

### **3.1 错误处理规约**:

    *   **原则**: 应用层必须返回明确的、可区分的错误类型，以便上游（如API网关）进行精确处理。
    *   **业务异常 (Business Errors)**:
        *   `ErrOrderNotFound` (建议对应HTTP 404): 当通过ID找不到订单时。
        *   `ErrInvalidOrderStatus` (建议对应HTTP 409): 当对状态不正确的订单执行操作时。
        *   `ErrValidationFailed` (建议对应HTTP 400): 当命令或查询对象的输入数据验证失败时。
    *   **系统错误 (System Errors)** (建议对应HTTP 500):
        *   由意外的基础设施故障引起（如数据库断开、网络超时）。所有此类错误都应被包装为通用的内部错误，并记录详细日志。

### **3.2 代码组织结构约定**

- **包/目录结构图**:

```
[限界上下文名称]/
├── application/
│   ├── command/
│   └── query/
├── domain/
│   ├── model/
│   │   └── [聚合名称1]/
│   └── service/
├── infrastructure/
│   ├── persistence/
│   └── external/
└── interfaces/ (or api/)
    └── facade/ (可选)
```

- **各模块核心职责**:

    - `domain`: 包含所有技术无关的业务逻辑核心。定义聚合、实体、值对象、领域事件以及仓储接口。**此模块不应依赖任何其他模块。**
    - `application`: 编排领域层和基础设施层来完成业务用例。定义命令、查询、应用服务和DTO。**此模块依赖domain层。**
    - `infrastructure`: 提供所有技术实现。实现仓储接口（与数据库交互）、与外部系统（如消息队列、第三方API）的集成。**此模块依赖domain和application层。**
    - `interfaces` (或`adapter`): 适配器层，负责与外部世界（如HTTP API, gRPC, CLI）的输入进行交互和转换。**此模块依赖application层。**

- **核心命名约定**:
    - 命令: `XxxCommand` (e.g., `PlaceOrderCommand`)
    - 查询: `XxxQuery` (e.g., `GetOrderDetailsQuery`)
    - 仓储接口: `XxxRepository` (e.g., `OrderRepository`)
    - DAO接口: `XxxDAO` (e.g., `OrderDAO`)
    - 数据传输对象: `XxxDTO` (e.g., `OrderDetailsDTO`)

---

## **4. 领域层设计 (Domain Layer Design)**

_AI指令：本章定义了业务的核心。你的代码生成应严格遵循此处的模型、不变量和纯粹的**业务逻辑**。_

### **4.1 聚合: `订单 (Order)`**

> **职责**: 封装一次交易的完整快照，保护其在支付后的不可变性，并管理其从创建到完成的生命周期。

- **属性**:

    - `ID`: `vo.OrderID` - 唯一标识符。
    - `Status`: `vo.OrderStatus` - 订单当前状态。
    - `TotalPrice`: `vo.Money` - 固化的订单总金额。
    - `LineItems`: `[]entity.LineItem` - 订单项列表。
    - `ShippingAddress`: `vo.ShippingAddress` - 收货地址快照。
    - `CreatedAt`: `time.Time` - 创建时间戳。

- **行为: `NewOrder` (工厂)**

    - **职责**: 根据业务规则创建一个新的`Order`聚合实例。
    - **契约**:
        - **输入**:
            - `cart`: `domain.Cart` - 一个代表购物车的领域对象（其结构由购物车上下文定义）。
            - `address`: `vo.ShippingAddress` - 收货地址值对象，其结构如下:
                - `RecipientName`: `string` - 收件人姓名。
                - `Phone`: `string` - 联系电话，应进行格式校验。
                - `FullAddress`: `string` - 省市区+详细街道地址。
        - **输出**:
            - `*domain.Order` - 新创建的、完整的`Order`聚合实例。
            - `error` - 如果创建失败（如购物车为空），返回具体错误。
    - **逻辑描述**:
        1.  **校验**: 确保输入的购物车非空。
        2.  **计算**: 累加所有商品项价格，形成`TotalPrice`。
        3.  **创建**: 实例化一个新的`Order`，状态初始化为`PENDING_PAYMENT`。
    - **发布事件**: `OrderPlaced`

- **行为: `ConfirmPayment`**
    - **职责**: 在确认支付成功后，变更订单状态。
    - **契约**:
        - **输入**:
            - `confirmation`: `vo.PaymentConfirmation` - 支付确认信息值对象，其结构如下:
                - `TransactionID`: `string` - 支付网关返回的交易流水号。
                - `PaidAmount`: `vo.Money` - 实际支付的金额。
                - `PaidAt`: `time.Time` - 支付成功的时间戳。
        - **输出**:
            - `error` - 如果状态不满足前置条件（如订单不处于`PENDING_PAYMENT`状态），返回错误。
    - **逻辑描述**:
        1.  **前置条件**: 检查当前`Status`必须为`PENDING_PAYMENT`。
        2.  **状态变更**: 将`Status`更新为`PAID`。
    - **发布事件**: `OrderPaid`

#### **4.1.1 内部实体: `LineItem`**

> **职责**: 代表`Order`聚合内部的一个具体条目，其生命周期完全由`Order`管理。

- **属性**:
    - `ID`: `vo.LineItemID` - 订单项唯一标识。
    - `ProductID`: `vo.ProductID` - 商品唯一标识快照。
    - `ProductName`: `string` - 商品名称快照。
    - `UnitPrice`: `vo.Money` - 冻结的商品单价。
    - `Quantity`: `int` - 购买数量。
- **验证规则**:
    - `Quantity` 必须大于0。

#### **4.1.2 内部值对象**

> **职责**: `Order`聚合内部使用的、代表不可变概念的数据结构。

- **`ShippingAddress`**
    - **属性**: `RecipientName`, `Phone`, `FullAddress`
    - **验证规则**:
        - 所有属性均不可为空字符串。
        - `Phone` 必须符合有效的电话号码格式。
- **`Money`**
    - **属性**: `Amount` (decimal), `Currency` (string)
    - **验证规则**:
        - `Amount` 必须大于或等于零。
        - `Currency` 必须是有效的ISO 4217货币代码。

---

## **5. 应用层设计 (Application Layer Design)**

_AI指令：本章定义了系统的所有用例(Use Cases)。你的代码生成应严格遵循此处描述的**执行流程**。_

### **5.1 应用服务: `OrderApplicationService`**

> **职责**: 作为`交易上下文`的门面，编排领域对象和基础设施服务来完成业务用例。

#### **5.1.1 用例: `PlaceOrder` (下单)**

- **关联用户故事**: `US-101`
- **契约**:
    - **输入**:
        - `ctx`: `context.Context` - 请求上下文，用于传递超时、追踪等信息。
        - `cmd`: `command.PlaceOrderCommand` - 包含下单所需全部数据的命令对象。其结构如下:
            - `UserID`: `vo.UserID` - 发起订单的用户的唯一标识。
            - `CartID`: `vo.CartID` - 用户提交的购物车的唯一标识。
            - `ShippingAddress`: `dto.ShippingAddressDTO` - 收货地址数据传输对象，其结构与`vo.ShippingAddress`一致。
    - **输出**:
        - `vo.OrderID` - 新创建订单的唯一标识。
        - `error` - 如果用例执行失败（如校验失败、库存不足等）。
- **执行流程**:
    1.  **日志(INFO)**: "Placing order for user {UserID} with cart {CartID}."
    2.  **入口防护**: 验证`cmd`对象的完整性和格式。失败则返回`ErrValidationFailed`。
    3.  **信息准备**:
        - a. 从`cmd.ShippingAddress` DTO创建`vo.ShippingAddress`值对象。创建失败则返回`ErrValidationFailed`。
        - b. 调用`购物车上下文`获取`domain.Cart`领域对象。
        - c. 调用`TradeEligibilityService.Check`进行交易资格预校验。
    4.  **核心处理**: 调用`domain.NewOrder`行为，创建`Order`聚合，并获取其待发布的领域事件。
    5.  **状态变更**: **在一个数据库事务中**，原子性地执行以下操作：
        - a. 调用仓储的`Save`方法保存`Order`聚合。
        - b. 调用事件仓储保存领域事件至“发件箱”。
    6.  **出口处理**: 成功后，返回新创建订单的`OrderID`。
    7.  **日志(INFO)**: "Order {OrderID} placed successfully for user {UserID}."
    8.  **异常处理**: 任何步骤失败都将记录**日志(ERROR)**，并返回一个明确的业务异常或通用系统错误。

#### **5.1.2 用例: `HandlePaymentConfirmation` (处理支付确认)**

- **关联用户故事**: `US-102`
- **契约**:
    - **输入**:
        - `ctx`: `context.Context` - 请求上下文。
        - `cmd`: `command.HandlePaymentConfirmationCommand` - 包含支付确认所需全部数据的命令对象。其结构如下:
            - `OrderID`: `vo.OrderID` - 需要确认支付的订单ID。
            - `PaymentConfirmation`: `dto.PaymentConfirmationDTO` - 支付确认数据传输对象，其结构与`vo.PaymentConfirmation`一致。
    - **输出**:
        - `error` - 如果用例执行失败（如订单未找到、状态错误等）。
- **执行流程**:
    1.  **日志(INFO)**: "Handling payment confirmation for order {OrderID}."
    2.  **入口防护**: 验证`cmd`。失败则返回`ErrValidationFailed`。
    3.  **信息准备**:
        - a. **在一个数据库事务中**，调用仓储的`FindByID`方法查找并加载`Order`聚合。如果未找到，返回`ErrOrderNotFound`。
        - b. 从`cmd.PaymentConfirmation` DTO创建`vo.PaymentConfirmation`值对象。
    4.  **核心处理**: 调用已加载`Order`对象的`ConfirmPayment`行为，执行领域逻辑，并获取其待发布的领域事件。
    5.  **状态变更**: 在同一个事务中，原子性地执行以下操作：
        - a. 调用仓储的`Save`方法保存变更后的`Order`聚合。
        - b. 调用事件仓储保存领域事件至“发件箱”。
    6.  **出口处理**: 成功后无返回值。
    7.  **日志(INFO)**: "Payment confirmed for order {OrderID}."
    8.  **异常处理**: 任何步骤失败都将记录**日志(ERROR)**，并返回一个明确的错误。

### **5.2 查询服务: `OrderQueryService`**

> **服务职责**: 实现所有**查询用例**。提供高效的数据读取服务，**绕过领域层**，直接查询数据库，并将结果映射为DTO。

#### **5.2.1 查询: `GetOrderDetails`**

- **关联用户故事**: `US-201`
- **契约**:
    - **输入**:
        - `ctx`: `context.Context` - 请求上下文。
        - `query`: `query.GetOrderDetailsQuery` - 包含获取单个订单详情所需参数的查询对象。其结构如下:
            - `OrderID`: `vo.OrderID` - 要查询的订单的唯一标识。
    - **输出**:
        - `*dto.OrderDetailsDTO` - 一个为详情页优化的、可能为`nil`的扁平化数据传输对象。其结构如下:
            - `OrderID`: `string` - 订单ID。
            - `OrderStatus`: `string` - 订单状态的文本描述（如"待支付"）。
            - `TotalPrice`: `string` - 格式化后的总价（如 "¥199.00"）。
            - `CreatedAt`: `string` - 格式化后的创建时间（如 "2023-10-27 10:00:00"）。
            - `ShippingInfo`: `object` - 收货信息对象，结构为 `{ "RecipientName": "string", "Phone": "string", "FullAddress": "string" }`。
            - `Items`: `array` - 订单项列表，每个元素的结构为 `[ { "ProductName": "string", "UnitPrice": "string", "Quantity": "int" } ]`。
        - `error` - 如果查询过程中发生错误。
- **逻辑描述**:
    1.  调用`OrderDAO.GetOrderDetailsDTO`。
    2.  如果DAO层返回未找到错误，则本服务将其转换为`ErrOrderNotFound`。
    3.  执行一个预先准备好的、优化的SQL `JOIN`查询，关联`orders`, `order_items`等表，获取指定`OrderID`的所有展示所需数据。
    4.  将查询结果直接映射（Hydrate）到`dto.OrderDetails`对象。此DTO是一个扁平化的数据结构，专为UI展示设计。

#### **5.2.2 查询: `ListOrdersForUser`**

- **关联用户故事**: `US-202`
- **契约**:
    - **输入**:
        - `ctx`: `context.Context` - 请求上下文。
        - `query`: `query.ListOrdersForUserQuery` - 包含获取用户订单列表所需参数的查询对象。其结构如下:
            - `UserID`: `vo.UserID` - 要查询的用户的唯一标识。
            - `Page`: `int` - 页码（从1开始）。
            - `PageSize`: `int` - 每页数量。
    - **输出**:
        - `[]*dto.OrderSummaryDTO` - 一个订单摘要DTO的切片，可能为空。每个元素的结构如下:
            - `OrderID`: `string` - 订单ID。
            - `OrderStatus`: `string` - 订单状态的文本描述。
            - `TotalPrice`: `string` - 格式化后的总价。
            - `CreatedAt`: `string` - 格式化后的创建时间。
            - `FirstItemImageURL`: `string` - 订单中第一个商品的图片URL，用于列表展示。
        - `*dto.PaginationDTO` - 一个包含分页信息的DTO。其结构如下:
            - `CurrentPage`: `int` - 当前页码。
            - `PageSize`: `int` - 每页数量。
            - `TotalItems`: `int` - 总条目数。
            - `TotalPages`: `int` - 总页数。
        - `error` - 如果查询过程中发生错误。
- **逻辑描述**:
    1.  调用`OrderDAO.ListUserOrdersDTOs`。
    2.  根据DAO返回的总条目数，计算并组装`PaginationDTO`。
    3.  根据`UserID`和分页参数，执行SQL查询获取订单列表。
    4.  查询只选择列表页展示所需的摘要字段（如`OrderID`, `TotalPrice`, `Status`, `CreatedAt`）。
    5.  将结果集映射到`dto.OrderSummary`切片，并返回分页信息。

---

## **6. 基础设施层设计 (Infrastructure Layer Design)**

_AI指令：本章定义了与外部世界交互的接口和技术实现策略。你需要为这些接口生成具体的实现代码。_

### **6.1 仓储层 (写): `OrderRepository`**

> **仓储职责**: (接口: `domain.OrderRepository`) 为**命令侧**提供`Order`聚合的持久化和检索机制。

- **方法: `Save`**

    - **职责**: 新增或更新一个`Order`聚合实例。
    - **入参**:
        - `tx`: `*sql.Tx` - 数据库事务句柄。
        - `order`: `*domain.Order` - 需要持久化的、完整的`Order`聚合根实例 (其详细结构已在第3章定义)。
    - **返回值**:
        - `error` - 如果持久化失败。
    - **逻辑描述**: 检查ID是否存在，然后执行`INSERT`或`UPDATE`。

- **方法: `FindByID`**
    - **职责**: 根据ID查找并**完整重建**一个`Order`聚合实例，**仅供命令侧使用**。
    - **入参**:
        - `db`: `*sql.DB or *sql.Tx` - 数据库连接或事务句柄。
        - `id`: `vo.OrderID` - 要查找的聚合根ID。
    - **返回值**:
        - `*domain.Order` - 重建的`Order`聚合根实例。
        - `error` - 如果未找到或发生数据库错误。
    - **逻辑描述**: `JOIN`查询主子表，然后Rehydrate成一个完整的聚合对象。

### **6.2 查询DAO层 (读): `OrderDAO`**

> **DAO职责**: 为**查询侧** (`OrderQueryService`) 提供直接的数据库访问能力。

- **方法: `GetOrderDetailsDTO`**

    - **职责**: 执行获取订单详情的SQL查询。
    - **入参**:
        - `db`: `*sql.DB` - 数据库连接。
        - `id`: `vo.OrderID` - 要查询的订单ID。
    - **返回值**:
        - `*dto.OrderDetailsDTO` - 订单详情DTO (其详细结构已在4.2.1节定义)。
        - `error` - 如果发生数据库错误。
    - **逻辑描述**: 执行SQL，并将结果扫描进`dto.OrderDetails`结构体。

- **方法: `ListUserOrdersDTOs`**
    - **职责**: 执行获取用户订单列表的SQL查询。
    - **入参**:
        - `db`: `*sql.DB` - 数据库连接。
        - `userID`: `vo.UserID` - 要查询的用户ID。
        - `page`: `int` - 页码。
        - `pageSize`: `int` - 每页数量。
    - **返回值**:
        - `[]*dto.OrderSummaryDTO` - 订单摘要DTO列表 (其详细结构已在4.2.2节定义)。
        - `int` - 符合条件的总条目数，用于计算总页数。
        - `error` - 如果发生数据库错误。
    - **逻辑描述**: 执行带`LIMIT`和`OFFSET`的SQL，并将结果扫描进`dto.OrderSummary`切片。同时执行`COUNT(*)`获取总数。

---

## **7. 测试策略 (Testing Strategy)**

_AI指令：本章定义了如何验证本上下文实现的正确性。生成的测试代码必须严格遵循分层测试策略，确保高覆盖率和高执行效率。_

> **核心原则**: 我们遵循**测试金字塔**模型。测试的重点放在快速、可靠的单元测试和集成测试上，辅以少量的、覆盖关键路径的端到端测试。

### **7.1 领域层：单元测试 (Unit Tests)**

- **测试目标**: 验证领域对象（聚合、实体、值对象）内部的**业务逻辑和不变量**是否正确。
- **测试对象**: `domain`包下的所有对象和行为。
- **核心策略**:
    1.  **完全隔离**: 测试必须在**纯内存**中运行，**严禁**任何对数据库、文件系统、网络或外部依赖的调用。
    2.  **无需Mock**: 领域对象内部的协作不应被mock。测试一个聚合行为时，应完整地创建该聚合及其内部的实体和值对象。
    3.  **关注边界条件**: 重点测试业务规则的边界条件，例如：
        - 对处于错误状态的订单调用`ConfirmPayment`。
        - 用无效参数（如负数金额）创建`Money`值对象。
    4.  **断言结果与事件**: 每个行为测试不仅要断言聚合的最终状态，还要断言其是否正确生成了预期的领域事件。

### **7.2 应用层：集成测试 (Integration Tests)**

- **测试目标**: 验证一个完整的**用例或查询**是否能够正确地编排领域层和基础设施层，并完成端到端的业务流程（从命令/查询到持久化/DTO）。
- **测试对象**: `application`包下的`OrderApplicationService`和`OrderQueryService`。
- **核心策略**:
    1.  **真实数据库依赖**:
        - **首选方案**: 使用**Testcontainers**在测试执行期间动态启动一个真实的数据库实例（如PostgreSQL, MySQL）。这提供了最高的测试保真度。
        - **备选方案**: 对于快速验证，可以使用内存数据库（如SQLite），但需注意其与生产数据库在SQL方言上的差异。
    2.  **Mock外部网关**: 所有对外部限界上下文的调用（如通过HTTP Gateway调用促销上下文）**必须被Mock**。我们只测试本上下文的逻辑，不测试外部服务的可用性。
    3.  **事务性验证**: 对于命令侧的用例，测试需要验证：
        - 业务数据是否在**一个事务内**被正确持久化。
        - 领域事件是否被原子性地存入了**发件箱（Outbox）表**。
    4.  **端到端数据流**: 测试应覆盖从接收`Command`/`Query`对象，到最终返回`vo.OrderID`或`DTO`的完整数据流。

### **7.3 接口层：端到端测试 (End-to-End Tests)**

- **测试目标**: 验证系统暴露的API（如HTTP RESTful API）是否能够正确工作，模拟真实的用户请求。
- **测试对象**: `interfaces`包下的HTTP Handler/Controller。
- **核心策略**:
    1.  **少量而精**: 只对最关键的用户场景（Happy Path）编写E2E测试，如“成功下单并支付”的完整流程。
    2.  **HTTP测试库**: 使用标准库的`net/http/httptest`包来启动一个内存中的HTTP服务器进行测试，避免监听真实端口。
    3.  **覆盖请求到响应**: 测试应覆盖从构建HTTP请求、发送请求、到解析HTTP响应、并断言响应状态码和Body内容的完整过程。
    4.  **依赖注入**: 在测试启动时，为API层注入一个配置了真实依赖（或部分mock依赖）的完整应用实例。

---

## **8. 待决策项与风险 (Open Questions & Risks)**

_AI指令：暴露设计中的不确定性或需要团队进一步讨论决策的地方。_

- **待决策1: 订单号生成策略**

    - **问题**: 订单号（非主键ID）应全局唯一且具有一定可读性。其生成逻辑应该放在哪里？
    - **建议**: 作为一个独立的、跨上下文的**通用ID生成服务**实现。应用服务层在创建订单时调用它。

- **风险1: 事件中继器延迟**
    - **描述**: 基于轮询的事件中继器存在一定的延迟（取决于轮询间隔）。
    - **缓解措施**: 对于大多数业务，秒级的最终一致性延迟是可以接受的。如果未来出现对实时性要求极高的场景，届时再评估升级到消息队列方案。
