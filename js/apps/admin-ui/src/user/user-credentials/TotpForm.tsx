import React from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  ActionGroup,
  Button,
  ButtonVariant,
} from "@patternfly/react-core";
import { ListItem } from "@patternfly/react-core"; // or your own wrapper
import { TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";

type TotpFormData = {
    "totp-device": string;
    "totp-code": string;
  };

  type TotpFormProps = {
    totp: any; // use a specific type if available
    tozMfa: any
  };

  const TotpForm: React.FC<TotpFormProps> = ({ totp, tozMfa }) => {
    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<TotpFormData>({
      defaultValues: {
        "totp-device": "totp",
        "totp-code": "",
      },
    });

    const { t } = useTranslation();

    const onSubmit = (data: TotpFormData) => {
      tozMfa.RegisterTotp(totp, data["totp-code"], data["totp-device"]);
    };

    return (
        <Form>
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextControl
              name="totp-device"
              control={control}
              label={t("totpDeviceName")}
              rules={{ required: t("required") }}
              defaultValue="totp"
            />

            <TextControl
              name="totp-code"
              control={control}
              label={t("totpCode")}
              rules={{ required: t("required") }}
            />

            <ActionGroup>
              <Button
                id="reset-submit"
                data-testid="submit"
                key="submit"
                type="submit"
                variant={ButtonVariant.primary}
              >
                {t("submit")}
              </Button>
            </ActionGroup>
          </form>
        </Form>
    );
  };

  export default TotpForm;
