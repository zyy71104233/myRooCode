import { HTMLAttributes } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { GitBranch } from "lucide-react"
import { Trans } from "react-i18next"
import { buildDocLink } from "@src/utils/docLinks"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"

type CheckpointSettingsProps = HTMLAttributes<HTMLDivElement> & {
	enableCheckpoints?: boolean
	setCachedStateField: SetCachedStateField<"enableCheckpoints">
}

export const CheckpointSettings = ({ enableCheckpoints, setCachedStateField, ...props }: CheckpointSettingsProps) => {
	const { t } = useAppTranslation()
	return (
		<div {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<GitBranch className="w-4" />
					<div>{t("settings:sections.checkpoints")}</div>
				</div>
			</SectionHeader>

			<Section>
				<div>
					<VSCodeCheckbox
						checked={enableCheckpoints}
						onChange={(e: any) => {
							setCachedStateField("enableCheckpoints", e.target.checked)
						}}>
						<span className="font-medium">{t("settings:checkpoints.enable.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						<Trans i18nKey="settings:checkpoints.enable.description">
							<VSCodeLink
								href={buildDocLink("features/checkpoints", "settings_checkpoints")}
								style={{ display: "inline" }}>
								{" "}
							</VSCodeLink>
						</Trans>
					</div>
				</div>
			</Section>
		</div>
	)
}
