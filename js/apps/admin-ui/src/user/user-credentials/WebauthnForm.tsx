import { useForm } from "react-hook-form";
import { TozMFA } from "../utils/TozMfa";
import KeycloakAdminClient, { NetworkError } from "@keycloak/keycloak-admin-client";
import { useTranslation } from "react-i18next";
import { TextControl, useAlerts } from "@keycloak/keycloak-ui-shared";
import {
  Form,
  Button,
  ButtonVariant,
  AlertVariant,
  ActionGroup,
} from "@patternfly/react-core";
import { useState } from "react";

type WebauthnFormData = {
    "webauthnLabel": string;

  };

  type WebauthnFormProps = {
    tozMfa: TozMFA
    adminClient : KeycloakAdminClient
    onSuccess: (value: boolean) => void
  };

const WebauthnForm: React.FC<WebauthnFormProps> = ({tozMfa, adminClient, onSuccess }) => {
    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<WebauthnFormData>({
      defaultValues: {
        "webauthnLabel": "securitykey"
      },
    });

    const { t } = useTranslation();
    const { addAlert, addError } = useAlerts();
    const [ isCompleted, setIsCompleted] = useState(false)

    const onSubmit = async (data: WebauthnFormData) => {
      try{
        let accessToken = await adminClient.getAccessToken();
        let webauthnLabel = data["webauthnLabel"]
        await tozMfa.InitiateWebauthn(webauthnLabel, accessToken!)
        onSuccess(true)
        setIsCompleted(true)
        addAlert(`Successfully registered credential ${webauthnLabel}`, AlertVariant.success);
      } catch (err){
        if (err instanceof NetworkError){
          addError(`Unable to register credential: ${err.message}`, AlertVariant.danger);
        } else if (err instanceof Error){
          addError(`Something went wrong: ${t(err.message)}`, AlertVariant.danger);
        }
      }

    };

    return (
            <Form onSubmit={handleSubmit(onSubmit)}>
                <TextControl
                  name="webauthnLabel"
                  control={control}
                  label={t("webauthnLabel")}
                  rules={{ required: t("required") }}
                  defaultValue="securitykey"
                />
                <ActionGroup>
                  <Button
                    id="webauthn-submit"
                    data-testid="webauthn-submit"
                    key="submit"
                    type="submit"
                    variant={ButtonVariant.primary}
                    isDisabled={isCompleted}
                  >
                      {t("submit")}
                  </Button>
                </ActionGroup>

            </Form>
        );
}

export default WebauthnForm
