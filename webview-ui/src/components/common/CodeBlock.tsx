import { memo, useEffect, useRef, useCallback, useState } from "react"
import styled from "styled-components"
import { useCopyToClipboard } from "@src/utils/clipboard"
import { getHighlighter, isLanguageLoaded, normalizeLanguage, ExtendedLanguage } from "@src/utils/highlighter"
import { bundledLanguages } from "shiki"
import type { ShikiTransformer } from "shiki"
import { ChevronDown, ChevronUp, WrapText, AlignJustify, Copy, Check } from "lucide-react"
import { useAppTranslation } from "@src/i18n/TranslationContext"

export const CODE_BLOCK_BG_COLOR = "var(--vscode-editor-background, --vscode-sideBar-background, rgb(30 30 30))"
export const WRAPPER_ALPHA = "cc" // 80% opacity

// Configuration constants
export const WINDOW_SHADE_SETTINGS = {
	transitionDelayS: 0.2,
	collapsedHeight: 500, // Default collapsed height in pixels
}

// Tolerance in pixels for determining when a container is considered "at the bottom"
export const SCROLL_SNAP_TOLERANCE = 20

/*
overflowX: auto + inner div with padding results in an issue where the top/left/bottom padding renders but the right padding inside does not count as overflow as the width of the element is not exceeded. Once the inner div is outside the boundaries of the parent it counts as overflow.
https://stackoverflow.com/questions/60778406/why-is-padding-right-clipped-with-overflowscroll/77292459#77292459
this fixes the issue of right padding clipped off 
“ideal” size in a given axis when given infinite available space--allows the syntax highlighter to grow to largest possible width including its padding
minWidth: "max-content",
*/

interface CodeBlockProps {
	source?: string
	rawSource?: string // Add rawSource prop for copying raw text
	language: string
	preStyle?: React.CSSProperties
	initialWordWrap?: boolean
	collapsedHeight?: number
	initialWindowShade?: boolean
	onLanguageChange?: (language: string) => void
}

const CodeBlockButton = styled.button`
	background: transparent;
	border: none;
	color: var(--vscode-foreground);
	cursor: var(--copy-button-cursor, default);
	padding: 4px;
	margin: 0 0px;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.4;
	border-radius: 3px;
	pointer-events: var(--copy-button-events, none);
	margin-left: 4px;
	height: 24px;
	width: 24px;

	&:hover {
		background: var(--vscode-toolbar-hoverBackground);
		opacity: 1;
	}

	/* Style for Lucide icons to ensure consistent sizing and positioning */
	svg {
		display: block;
	}
`

const CodeBlockButtonWrapper = styled.div`
	position: fixed;
	top: var(--copy-button-top);
	right: var(--copy-button-right, 8px);
	height: auto;
	z-index: 100;
	background: ${CODE_BLOCK_BG_COLOR}${WRAPPER_ALPHA};
	overflow: visible;
	pointer-events: none;
	opacity: var(--copy-button-opacity, 0);
	padding: 4px 6px;
	border-radius: 3px;
	display: inline-flex;
	align-items: center;
	justify-content: center;

	&:hover {
		background: var(--vscode-editor-background);
		opacity: 1 !important;
	}

	${CodeBlockButton} {
		position: relative;
		top: 0;
		right: 0;
	}
`

const CodeBlockContainer = styled.div`
	position: relative;
	overflow: hidden;
	background-color: ${CODE_BLOCK_BG_COLOR};

	${CodeBlockButtonWrapper} {
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s; /* Keep opacity transition for buttons */
	}

	&[data-partially-visible="true"]:hover ${CodeBlockButtonWrapper} {
		opacity: 1;
		pointer-events: all;
		cursor: pointer;
	}
`

export const StyledPre = styled.div<{
	preStyle?: React.CSSProperties
	wordwrap?: "true" | "false" | undefined
	windowshade?: "true" | "false"
	collapsedHeight?: number
}>`
	background-color: ${CODE_BLOCK_BG_COLOR};
	max-height: ${({ windowshade, collapsedHeight }) =>
		windowshade === "true" ? `${collapsedHeight || WINDOW_SHADE_SETTINGS.collapsedHeight}px` : "none"};
	overflow-y: auto;
	padding: 10px;
	border-radius: 5px;
	${({ preStyle }) => preStyle && { ...preStyle }}

	pre {
		background-color: ${CODE_BLOCK_BG_COLOR};
		border-radius: 5px;
		margin: 0;
		padding: 10px;
		width: 100%;
		box-sizing: border-box;
	}

	pre,
	code {
		/* Undefined wordwrap defaults to true (pre-wrap) behavior. */
		white-space: ${({ wordwrap }) => (wordwrap === "false" ? "pre" : "pre-wrap")};
		word-break: ${({ wordwrap }) => (wordwrap === "false" ? "normal" : "normal")};
		overflow-wrap: ${({ wordwrap }) => (wordwrap === "false" ? "normal" : "break-word")};
		font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
		font-family: var(--vscode-editor-font-family);
	}

	pre > code {
		.hljs-deletion {
			background-color: var(--vscode-diffEditor-removedTextBackground);
			display: inline-block;
			width: 100%;
		}
		.hljs-addition {
			background-color: var(--vscode-diffEditor-insertedTextBackground);
			display: inline-block;
			width: 100%;
		}
	}

	.hljs {
		color: var(--vscode-editor-foreground, #fff);
		background-color: ${CODE_BLOCK_BG_COLOR};
	}
`

const LanguageSelect = styled.select`
	font-size: 12px;
	color: var(--vscode-foreground);
	opacity: 0.4;
	font-family: monospace;
	appearance: none;
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px;
	margin: 0;
	vertical-align: middle;
	height: 24px;

	& option {
		background: var(--vscode-editor-background);
		color: var(--vscode-foreground);
		padding: 0;
		margin: 0;
	}

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-background);
	}

	&::-webkit-scrollbar-track {
		background: var(--vscode-editor-background);
	}

	&:hover {
		opacity: 1;
		background: var(--vscode-toolbar-hoverBackground);
		border-radius: 3px;
	}

	&:focus {
		opacity: 1;
		outline: none;
		border-radius: 3px;
	}
`

const CodeBlock = memo(
	({
		source,
		rawSource,
		language,
		preStyle,
		initialWordWrap = true,
		initialWindowShade = true,
		collapsedHeight,
		onLanguageChange,
	}: CodeBlockProps) => {
		const [wordWrap, setWordWrap] = useState(initialWordWrap)
		const [windowShade, setWindowShade] = useState(initialWindowShade)
		const [currentLanguage, setCurrentLanguage] = useState<ExtendedLanguage>(() => normalizeLanguage(language))
		const userChangedLanguageRef = useRef(false)
		const [highlightedCode, setHighlightedCode] = useState<string>("")
		const [showCollapseButton, setShowCollapseButton] = useState(true)
		const codeBlockRef = useRef<HTMLDivElement>(null)
		const preRef = useRef<HTMLDivElement>(null)
		const copyButtonWrapperRef = useRef<HTMLDivElement>(null)
		const { showCopyFeedback, copyWithFeedback } = useCopyToClipboard()
		const { t } = useAppTranslation()

		// Update current language when prop changes, but only if user hasn't
		// made a selection.
		useEffect(() => {
			const normalizedLang = normalizeLanguage(language)

			if (normalizedLang !== currentLanguage && !userChangedLanguageRef.current) {
				setCurrentLanguage(normalizedLang)
			}
		}, [language, currentLanguage])

		// Syntax highlighting with cached Shiki instance.
		useEffect(() => {
			const fallback = `<pre style="padding: 0; margin: 0;"><code class="hljs language-${currentLanguage || "txt"}">${source || ""}</code></pre>`

			const highlight = async () => {
				// Show plain text if language needs to be loaded.
				if (currentLanguage && !isLanguageLoaded(currentLanguage)) {
					setHighlightedCode(fallback)
				}

				const highlighter = await getHighlighter(currentLanguage)

				const html = await highlighter.codeToHtml(source || "", {
					lang: currentLanguage || "txt",
					theme: document.body.className.toLowerCase().includes("light") ? "github-light" : "github-dark",
					transformers: [
						{
							pre(node) {
								node.properties.style = "padding: 0; margin: 0;"
								return node
							},
							code(node) {
								// Add hljs classes for consistent styling
								node.properties.class = `hljs language-${currentLanguage}`
								return node
							},
							line(node) {
								// Preserve existing line handling
								node.properties.class = node.properties.class || ""
								return node
							},
						},
					] as ShikiTransformer[],
				})

				setHighlightedCode(html)
			}

			highlight().catch((e) => {
				console.error("[CodeBlock] Syntax highlighting error:", e, "\nStack trace:", e.stack)
				setHighlightedCode(fallback)
			})
		}, [source, currentLanguage, collapsedHeight])

		// Check if content height exceeds collapsed height whenever content changes
		useEffect(() => {
			const codeBlock = codeBlockRef.current

			if (codeBlock) {
				const actualHeight = codeBlock.scrollHeight
				setShowCollapseButton(actualHeight >= WINDOW_SHADE_SETTINGS.collapsedHeight)
			}
		}, [highlightedCode])

		// Ref to track if user was scrolled up *before* the source update
		// potentially changes scrollHeight
		const wasScrolledUpRef = useRef(false)

		// Ref to track if outer container was near bottom
		const outerContainerNearBottomRef = useRef(false)

		// Effect to listen to scroll events and update the ref
		useEffect(() => {
			const preElement = preRef.current
			if (!preElement) return

			const handleScroll = () => {
				const isAtBottom =
					Math.abs(preElement.scrollHeight - preElement.scrollTop - preElement.clientHeight) <
					SCROLL_SNAP_TOLERANCE
				wasScrolledUpRef.current = !isAtBottom
			}

			preElement.addEventListener("scroll", handleScroll, { passive: true })
			// Initial check in case it starts scrolled up
			handleScroll()

			return () => {
				preElement.removeEventListener("scroll", handleScroll)
			}
		}, []) // Empty dependency array: runs once on mount

		// Effect to track outer container scroll position
		useEffect(() => {
			const scrollContainer = document.querySelector('[data-virtuoso-scroller="true"]')
			if (!scrollContainer) return

			const handleOuterScroll = () => {
				const isAtBottom =
					Math.abs(scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) <
					SCROLL_SNAP_TOLERANCE
				outerContainerNearBottomRef.current = isAtBottom
			}

			scrollContainer.addEventListener("scroll", handleOuterScroll, { passive: true })

			// Initial check
			handleOuterScroll()

			return () => {
				scrollContainer.removeEventListener("scroll", handleOuterScroll)
			}
		}, [])

		// Store whether we should scroll after highlighting completes
		const shouldScrollAfterHighlightRef = useRef(false)

		// Check if we should scroll when source changes
		useEffect(() => {
			// Only set the flag if we're at the bottom when source changes
			if (preRef.current && source && !wasScrolledUpRef.current) {
				shouldScrollAfterHighlightRef.current = true
			} else {
				shouldScrollAfterHighlightRef.current = false
			}
		}, [source])

		const updateCodeBlockButtonPosition = useCallback((forceHide = false) => {
			const codeBlock = codeBlockRef.current
			const copyWrapper = copyButtonWrapperRef.current

			if (!codeBlock) {
				return
			}

			const rectCodeBlock = codeBlock.getBoundingClientRect()
			const scrollContainer = document.querySelector('[data-virtuoso-scroller="true"]')

			if (!scrollContainer) {
				return
			}

			// Get wrapper height dynamically
			let wrapperHeight

			if (copyWrapper) {
				const copyRect = copyWrapper.getBoundingClientRect()

				// If height is 0 due to styling, estimate from children
				if (copyRect.height > 0) {
					wrapperHeight = copyRect.height
				} else if (copyWrapper.children.length > 0) {
					// Try to get height from the button inside
					const buttonRect = copyWrapper.children[0].getBoundingClientRect()
					const buttonStyle = window.getComputedStyle(copyWrapper.children[0] as Element)
					const buttonPadding =
						parseInt(buttonStyle.getPropertyValue("padding-top") || "0", 10) +
						parseInt(buttonStyle.getPropertyValue("padding-bottom") || "0", 10)
					wrapperHeight = buttonRect.height + buttonPadding
				}
			}

			// If we still don't have a height, calculate from font size
			if (!wrapperHeight) {
				const fontSize = parseInt(window.getComputedStyle(document.body).getPropertyValue("font-size"), 10)
				wrapperHeight = fontSize * 2.5 // Approximate button height based on font size
			}

			const scrollRect = scrollContainer.getBoundingClientRect()
			const copyButtonEdge = 48
			const isPartiallyVisible =
				rectCodeBlock.top < scrollRect.bottom - copyButtonEdge &&
				rectCodeBlock.bottom >= scrollRect.top + copyButtonEdge

			// Calculate margin from existing padding in the component
			const computedStyle = window.getComputedStyle(codeBlock)
			const paddingValue = parseInt(computedStyle.getPropertyValue("padding") || "0", 10)
			const margin =
				paddingValue > 0 ? paddingValue : parseInt(computedStyle.getPropertyValue("padding-top") || "0", 10)

			// Update visibility state and button interactivity
			const isVisible = !forceHide && isPartiallyVisible
			codeBlock.setAttribute("data-partially-visible", isPartiallyVisible ? "true" : "false")
			codeBlock.style.setProperty("--copy-button-cursor", isVisible ? "pointer" : "default")
			codeBlock.style.setProperty("--copy-button-events", isVisible ? "all" : "none")
			codeBlock.style.setProperty("--copy-button-opacity", isVisible ? "1" : "0")

			if (isPartiallyVisible) {
				// Keep button within code block bounds using dynamic measurements
				const topPosition = Math.max(
					scrollRect.top + margin,
					Math.min(rectCodeBlock.bottom - wrapperHeight - margin, rectCodeBlock.top + margin),
				)
				const rightPosition = Math.max(margin, scrollRect.right - rectCodeBlock.right + margin)

				codeBlock.style.setProperty("--copy-button-top", `${topPosition}px`)
				codeBlock.style.setProperty("--copy-button-right", `${rightPosition}px`)
			}
		}, [])

		useEffect(() => {
			const handleScroll = () => updateCodeBlockButtonPosition()
			const handleResize = () => updateCodeBlockButtonPosition()

			const scrollContainer = document.querySelector('[data-virtuoso-scroller="true"]')
			if (scrollContainer) {
				scrollContainer.addEventListener("scroll", handleScroll)
				window.addEventListener("resize", handleResize)
				updateCodeBlockButtonPosition()
			}

			return () => {
				if (scrollContainer) {
					scrollContainer.removeEventListener("scroll", handleScroll)
					window.removeEventListener("resize", handleResize)
				}
			}
		}, [updateCodeBlockButtonPosition])

		// Update button position and scroll when highlightedCode changes
		useEffect(() => {
			if (highlightedCode) {
				// Update button position
				setTimeout(updateCodeBlockButtonPosition, 0)

				// Scroll to bottom if needed (immediately after Shiki updates)
				if (shouldScrollAfterHighlightRef.current) {
					// Scroll inner container
					if (preRef.current) {
						preRef.current.scrollTop = preRef.current.scrollHeight
						wasScrolledUpRef.current = false
					}

					// Also scroll outer container if it was near bottom
					if (outerContainerNearBottomRef.current) {
						const scrollContainer = document.querySelector('[data-virtuoso-scroller="true"]')
						if (scrollContainer) {
							scrollContainer.scrollTop = scrollContainer.scrollHeight
							outerContainerNearBottomRef.current = true
						}
					}

					// Reset the flag
					shouldScrollAfterHighlightRef.current = false
				}
			}
		}, [highlightedCode, updateCodeBlockButtonPosition])

		// Advanced inertial scroll chaining
		// This effect handles the transition between scrolling the code block and the outer container.
		// When a user scrolls to the boundary of a code block (top or bottom), this implementation:
		// 1. Detects the boundary condition
		// 2. Applies inertial scrolling to the outer container for a smooth transition
		// 3. Adds physics-based momentum for natural deceleration
		// This creates a seamless experience where scrolling flows naturally between nested scrollable areas
		useEffect(() => {
			if (!preRef.current) return

			// Find the outer scrollable container
			const getScrollContainer = () => {
				return document.querySelector('[data-virtuoso-scroller="true"]') as HTMLElement
			}

			// Inertial scrolling implementation
			let velocity = 0
			let animationFrameId: number | null = null
			const FRICTION = 0.85 // Friction coefficient (lower = more friction)
			const MIN_VELOCITY = 0.5 // Minimum velocity before stopping

			// Animation function for inertial scrolling
			const animate = () => {
				const scrollContainer = getScrollContainer()
				if (!scrollContainer) return

				// Apply current velocity
				if (Math.abs(velocity) > MIN_VELOCITY) {
					scrollContainer.scrollBy(0, velocity)
					velocity *= FRICTION // Apply friction
					animationFrameId = requestAnimationFrame(animate)
				} else {
					velocity = 0
					animationFrameId = null
				}
			}

			// Wheel event handler with inertial scrolling
			const handleWheel = (e: WheelEvent) => {
				// If shift is pressed, let the browser handle default horizontal scrolling
				if (e.shiftKey) {
					return
				}
				if (!preRef.current) return

				// Only handle wheel events if the inner container has a scrollbar,
				// otherwise let the browser handle the default scrolling
				const hasScrollbar = preRef.current.scrollHeight > preRef.current.clientHeight

				// Pass through events if we don't need special handling
				if (!hasScrollbar) {
					return
				}

				const scrollContainer = getScrollContainer()
				if (!scrollContainer) return

				// Check if we're at the top or bottom of the inner container
				const isAtVeryTop = preRef.current.scrollTop === 0
				const isAtVeryBottom =
					Math.abs(preRef.current.scrollHeight - preRef.current.scrollTop - preRef.current.clientHeight) < 1

				// Handle scrolling at container boundaries
				if ((e.deltaY < 0 && isAtVeryTop) || (e.deltaY > 0 && isAtVeryBottom)) {
					// Prevent default to stop inner container from handling
					e.preventDefault()

					const boost = 0.15
					velocity += e.deltaY * boost

					// Start animation if not already running
					if (!animationFrameId) {
						animationFrameId = requestAnimationFrame(animate)
					}
				}
			}

			// Add wheel event listener to inner container
			const preElement = preRef.current
			preElement.addEventListener("wheel", handleWheel, { passive: false })

			// Clean up
			return () => {
				preElement.removeEventListener("wheel", handleWheel)

				// Cancel any ongoing animation
				if (animationFrameId) {
					cancelAnimationFrame(animationFrameId)
				}
			}
		}, [])

		// Track text selection state
		const [isSelecting, setIsSelecting] = useState(false)

		useEffect(() => {
			if (!preRef.current) return

			const handleMouseDown = (e: MouseEvent) => {
				// Only trigger if clicking the pre element directly
				if (e.currentTarget === preRef.current) {
					setIsSelecting(true)
				}
			}

			const handleMouseUp = () => {
				setIsSelecting(false)
			}

			const preElement = preRef.current
			preElement.addEventListener("mousedown", handleMouseDown)
			document.addEventListener("mouseup", handleMouseUp)

			return () => {
				preElement.removeEventListener("mousedown", handleMouseDown)
				document.removeEventListener("mouseup", handleMouseUp)
			}
		}, [])

		const handleCopy = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()

				// Check if code block is partially visible before allowing copy
				const codeBlock = codeBlockRef.current
				if (!codeBlock || codeBlock.getAttribute("data-partially-visible") !== "true") {
					return
				}
				const textToCopy = rawSource !== undefined ? rawSource : source || ""
				if (textToCopy) {
					copyWithFeedback(textToCopy, e)
				}
			},
			[source, rawSource, copyWithFeedback],
		)

		if (source?.length === 0) {
			return null
		}

		return (
			<CodeBlockContainer ref={codeBlockRef}>
				<MemoizedStyledPre
					preRef={preRef}
					preStyle={preStyle}
					wordWrap={wordWrap}
					windowShade={windowShade}
					collapsedHeight={collapsedHeight}
					highlightedCode={highlightedCode}
					updateCodeBlockButtonPosition={updateCodeBlockButtonPosition}
				/>
				{!isSelecting && (
					<CodeBlockButtonWrapper
						ref={copyButtonWrapperRef}
						onMouseOver={() => updateCodeBlockButtonPosition()}
						style={{ gap: 0 }}>
						<LanguageSelect
							value={currentLanguage}
							style={{
								width: `calc(${currentLanguage?.length || 0}ch + 9px)`,
							}}
							onClick={(e) => {
								e.currentTarget.focus()
							}}
							onChange={(e) => {
								const newLang = normalizeLanguage(e.target.value)
								userChangedLanguageRef.current = true
								setCurrentLanguage(newLang)
								if (onLanguageChange) {
									onLanguageChange(newLang)
								}
							}}>
							<option
								value={normalizeLanguage(language)}
								style={{ fontWeight: "bold", textAlign: "left", fontSize: "1.2em" }}>
								{normalizeLanguage(language)}
							</option>
							{
								// Display all available languages in alphabetical order
								Object.keys(bundledLanguages)
									.sort()
									.map((lang) => {
										const normalizedLang = normalizeLanguage(lang)
										return (
											<option
												key={normalizedLang}
												value={normalizedLang}
												style={{
													fontWeight: normalizedLang === currentLanguage ? "bold" : "normal",
													textAlign: "left",
													fontSize: normalizedLang === currentLanguage ? "1.2em" : "inherit",
												}}>
												{normalizedLang}
											</option>
										)
									})
							}
						</LanguageSelect>
						{showCollapseButton && (
							<CodeBlockButton
								onClick={() => {
									// Get the current code block element and scrollable container
									const codeBlock = codeBlockRef.current
									const scrollContainer = document.querySelector('[data-virtuoso-scroller="true"]')
									if (!codeBlock || !scrollContainer) return

									// Toggle window shade state
									setWindowShade(!windowShade)

									// After UI updates, ensure code block is visible and update button position
									setTimeout(
										() => {
											codeBlock.scrollIntoView({ behavior: "smooth", block: "nearest" })

											// Wait for scroll to complete before updating button position
											setTimeout(() => {
												updateCodeBlockButtonPosition()
											}, 50)
										},
										WINDOW_SHADE_SETTINGS.transitionDelayS * 1000 + 50,
									)
								}}
								title={t(`chat:codeblock.tooltips.${windowShade ? "expand" : "collapse"}`)}>
								{windowShade ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
							</CodeBlockButton>
						)}
						<CodeBlockButton
							onClick={() => setWordWrap(!wordWrap)}
							title={t(`chat:codeblock.tooltips.${wordWrap ? "disable_wrap" : "enable_wrap"}`)}>
							{wordWrap ? <AlignJustify size={16} /> : <WrapText size={16} />}
						</CodeBlockButton>
						<CodeBlockButton onClick={handleCopy} title={t("chat:codeblock.tooltips.copy_code")}>
							{showCopyFeedback ? <Check size={16} /> : <Copy size={16} />}
						</CodeBlockButton>
					</CodeBlockButtonWrapper>
				)}
			</CodeBlockContainer>
		)
	},
)

// Memoized content component to prevent unnecessary re-renders of highlighted code
const MemoizedCodeContent = memo(({ html }: { html: string }) => <div dangerouslySetInnerHTML={{ __html: html }} />)

// Memoized StyledPre component
const MemoizedStyledPre = memo(
	({
		preRef,
		preStyle,
		wordWrap,
		windowShade,
		collapsedHeight,
		highlightedCode,
		updateCodeBlockButtonPosition,
	}: {
		preRef: React.RefObject<HTMLDivElement>
		preStyle?: React.CSSProperties
		wordWrap: boolean
		windowShade: boolean
		collapsedHeight?: number
		highlightedCode: string
		updateCodeBlockButtonPosition: (forceHide?: boolean) => void
	}) => (
		<StyledPre
			ref={preRef}
			preStyle={preStyle}
			wordwrap={wordWrap ? "true" : "false"}
			windowshade={windowShade ? "true" : "false"}
			collapsedHeight={collapsedHeight}
			onMouseDown={() => updateCodeBlockButtonPosition(true)}
			onMouseUp={() => updateCodeBlockButtonPosition(false)}>
			<MemoizedCodeContent html={highlightedCode} />
		</StyledPre>
	),
)

export default CodeBlock
