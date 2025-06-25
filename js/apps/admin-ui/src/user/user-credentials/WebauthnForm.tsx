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
} from "@patternfly/react-core";

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
        "webauthnLabel": "webauthn"
      },
    });

    const { t } = useTranslation();
    const { addAlert, addError } = useAlerts();

    const onSubmit = async (data: WebauthnFormData) => {
      try{
        let accessToken = await adminClient.getAccessToken();
        let webauthnLabel = data["webauthnLabel"]
        await tozMfa.InitiateWebauthn(webauthnLabel, accessToken!)
        onSuccess(true)
        addAlert(`Successfully registered credential ${webauthnLabel}`, AlertVariant.success);
      } catch (err){
        if (err instanceof NetworkError){
          addError(`Unable to register credential: ${err.message}`, AlertVariant.danger);
        } else if (err instanceof Error){
          addError(`Something went wrong: ${err.message}`, AlertVariant.danger);
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
                  defaultValue="webauthn"
                />
                <Button
                  id="reset-submit"
                  data-testid="submit"
                  key="submit"
                  type="submit"
                  variant={ButtonVariant.primary}
                >
                    {t("submit")}
                </Button>
            </Form>
        );
}

export default WebauthnForm
