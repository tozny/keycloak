import { RequiredActionAlias } from "@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  ClipboardCopy,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
} from "@patternfly/react-core";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAdminClient } from "../../admin-client";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import {
  useConfirmDialog,
} from "../../components/confirm-dialog/ConfirmDialog";
import useToggle from "../../utils/useToggle";
import { ToznyPasswordBrokerFields, ToznyPasswordBrokerFieldsForm } from "../ToznyPasswordBrokerFields";
import { TozUser } from "../utils/TozUser";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useState } from "react";

// Toz customized this file.

type ResetPasswordDialogProps = {
  user: UserRepresentation;
  isResetPassword: boolean;
  onAddRequiredActions?: (requiredActions: string[]) => void;
  refresh: () => void;
  onClose: () => void;
  passedInResetLink?: string
};

export const ResetPasswordDialog = ({
  user,
  isResetPassword,
  refresh,
  onClose,
  passedInResetLink = "",
}: ResetPasswordDialogProps) => {
  const { adminClient } = useAdminClient();

  const { t } = useTranslation();
  const { realmRepresentation: realm } = useRealm();
  const tozUser = new TozUser(realm!)
  const [resetLink, setResetLink] = useState<string >(passedInResetLink);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<ToznyPasswordBrokerFieldsForm>({
    defaultValues: {
      authentication: {
        adminRecoveryExpirationMinutes: 60,
        emailRecoveryExpirationMinutes: 15
      },
      brokerUrl: realm?.attributes?.["recoverUri"]
    },
    mode: "onChange",
  });
  const {
    formState: { isValid, errors },
    handleSubmit,
    clearErrors,
    setError,
  } = form;

  const [confirm, toggle] = useToggle(true);

  const { addAlert, addError } = useAlerts();

  const [toggleConfirmSaveModal, ConfirmSaveModal] = useConfirmDialog({
    titleKey: isResetPassword ? "resetPasswordConfirm" : "setPasswordConfirm",
    messageKey: isResetPassword
      ? t("resetPasswordConfirmText", { username: user.username })
      : t("setPasswordConfirmText", { username: user.username }),
    continueButtonLabel: isResetPassword ? "resetPassword" : "savePassword",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: () => handleSubmit(saveUserPassword)(),
  });

  const saveUserPassword = async ({
    authentication
  }: ToznyPasswordBrokerFieldsForm) => {
    try {
      setIsLoading(true);
      const [resetLink, message] = await tozUser.ResetPassword(user.username!, authentication?.emailRecoveryExpirationMinutes, authentication?.adminRecoveryExpirationMinutes)
      if(resetLink != ""){
        setResetLink(resetLink)
        addAlert(
          isResetPassword
            ? t("resetCredentialsSuccess")
            : t("savePasswordSuccess"),
          AlertVariant.success,
        );
      } else {
        addError(message, new Error(message))
      }
    } catch (error) {
      addError(
        isResetPassword ? "resetPasswordError" : "savePasswordError",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <FormProvider {...form} >
        <Modal
          title={t("resetPasswordFor", { username: user.username })}
          isOpen={confirm}
          onClose={onClose}
          variant={ModalVariant.small}
        >
          <Form onSubmit={form.handleSubmit(saveUserPassword)}>
            <ToznyPasswordBrokerFields realm={realm!} />
            <FormGroup
              label={t("resetPasswordLink")}
              fieldId="kc-reset-password-uri"
            >
              <ClipboardCopy
                isReadOnly
              >{resetLink}</ClipboardCopy>
            </FormGroup>
            <ActionGroup>
              <Button
                id="reset-submit"
                data-testid="submit"
                key="submit"
                type="submit"
                isDisabled={!isValid || isLoading}
                isLoading={isLoading}
                variant={ButtonVariant.primary}
              >
                {t("resetPassword")}
              </Button>,
              <Button
                id="modal-cancel"
                data-testid="cancel"
                key="cancel"
                variant={ButtonVariant.link}
                onClick={() => {
                  if (onClose) onClose();
                  toggle();
                }}
              >
                {t("cancel")}
              </Button>
            </ActionGroup>
          </Form>
        </Modal>
      </FormProvider>
    </>
  );
};
