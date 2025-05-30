import { HelpItem, NumberControl, TextControl } from "@keycloak/keycloak-ui-shared";
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

            <NumberControl
                name="authentication.emailRecoveryExpirationMinutes"
                label={t("emailRecoveryExpirationMinutes")}
                controller={{ defaultValue: 15, rules: { min: 0 } }}
            />

            <NumberControl
                name="authentication.adminRecoveryExpirationMinutes"
                label={t("adminRecoveryExpirationMinutes")}
                type="number"
                controller={{ defaultValue: 60, rules: { min: 0 } }}
            />
        </>
    );
};
