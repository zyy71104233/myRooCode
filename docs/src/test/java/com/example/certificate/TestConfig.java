package com.example.certificate;

import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.mybatis.spring.boot.autoconfigure.MybatisAutoConfiguration;

@TestConfiguration
@ImportAutoConfiguration({
    DataSourceAutoConfiguration.class,
    MybatisAutoConfiguration.class
})
public class TestConfig {
}