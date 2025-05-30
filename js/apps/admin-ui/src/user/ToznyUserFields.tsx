import { HelpItem, TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import { FormGroup } from "@patternfly/react-core";

/**
 * Broker and email form fields for TozID user.
 * - brokerUrl
 * - authentication.emailRecoveryExpirationMinutes
 * - authentication.adminRecoveryExpirationMinutes
 */
export const ToznyUserFields = () => {
    const { t } = useTranslation();


    return (
        <>
            <TextControl
                name="brokerUrl"
                label={t("brokerUrl")}
                rules={{ required: t("required") }}
                labelIcon={
                    <HelpItem
                        helpText={t("temporaryLockedHelp")}
                        fieldLabelId="brokerUrl"
                    />
                }
            />

            <TextControl
                name="authentication.emailRecoveryExpirationMinutes"
                label={t("emailRecoveryExpirationMinutes")}
                type="number"
                rules={{
                    min: { value: 0, message: t("mustBePositive") },
                }}
                labelIcon={
                    <HelpItem
                        helpText={t("temporaryLockedHelp")}
                        fieldLabelId="emailRecoveryExpirationMinutes"
                    />
                }
            />

            <TextControl
                name="authentication.adminRecoveryExpirationMinutes"
                label={t("adminRecoveryExpirationMinutes")}
                type="number"
                rules={{
                    min: { value: 0, message: t("mustBePositive") },
                }}
                labelIcon={
                    <HelpItem
                        helpText={t("adminRecoveryExpirationMinutesHelp")}
                        fieldLabelId="adminRecoveryExpirationMinutes"
                    />
                }
            />
        </>
    );
};
