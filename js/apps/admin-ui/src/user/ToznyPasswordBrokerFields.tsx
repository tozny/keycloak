import { HelpItem, NumberControl, TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import { FormGroup } from "@patternfly/react-core";
import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation";

/**
 * Broker and email form fields for TozID user.
 * - brokerUrl
 * - authentication.emailRecoveryExpirationMinutes
 * - authentication.adminRecoveryExpirationMinutes
 */

type ToznyPasswordBrokerFieldsProps = {
    realm: RealmRepresentation;
};

export type ToznyPasswordBrokerFieldsForm = {
    brokerUrl?: string
    authentication?: {
        emailRecoveryExpirationMinutes?: number;
        adminRecoveryExpirationMinutes?: number;
    };
};

export const ToznyPasswordBrokerFields = ({ realm }: ToznyPasswordBrokerFieldsProps) => {
    const { t } = useTranslation();


    return (
        <>
            <TextControl
                name="brokerUrl"
                label={t("brokerUrl")}
                rules={{ required: t("required") }}
                labelIcon={t("brokerUrlHelp")}
                defaultValue={realm.attributes?.["recoverUri"]}
            />

            <NumberControl
                name="authentication.emailRecoveryExpirationMinutes"
                label={t("emailRecoveryExpirationMinutes")}
                labelIcon={t("emailRecoveryExpirationMinutesHelp")}
                controller={{ defaultValue: 15, rules: { min: 0 } }}
            />

            <NumberControl
                name="authentication.adminRecoveryExpirationMinutes"
                label={t("adminRecoveryExpirationMinutes")}
                labelIcon={t("adminRecoveryExpirationMinutesHelp")}
                controller={{ defaultValue: 60, rules: { min: 0 } }}
            />
        </>
    );
};
