import { RequiredActionAlias } from "@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import {
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
import { FormErrorText, HelpItem, PasswordInput } from "@keycloak/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { DefaultSwitchControl } from "../../components/SwitchControl";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import {
  ConfirmDialogModal,
  useConfirmDialog,
} from "../../components/confirm-dialog/ConfirmDialog";
import useToggle from "../../utils/useToggle";
import { ToznyPasswordBrokerFields, ToznyPasswordBrokerFieldsForm } from "../ToznyPasswordBrokerFields";
import { TozUser } from "../utils/TozUser";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useState } from "react";


type ResetPasswordDialogProps = {
  user: UserRepresentation;
  isResetPassword: boolean;
  onAddRequiredActions?: (requiredActions: string[]) => void;
  refresh: () => void;
  onClose: () => void;
};

export const ResetPasswordDialog = ({
  user,
  isResetPassword,
  refresh,
  onClose,
}: ResetPasswordDialogProps) => {
  const { adminClient } = useAdminClient();

  const { t } = useTranslation();
  const { realmRepresentation: realm } = useRealm();
  const tozUser = new TozUser(realm!)
  const [resetLink, setResetLink] = useState("");
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
    register,
    formState: { isValid, errors },
    watch,
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
      tozUser.ResetPassword(user.username!, authentication?.emailRecoveryExpirationMinutes, authentication?.adminRecoveryExpirationMinutes, setResetLink)
      addAlert(
        isResetPassword
          ? t("resetCredentialsSuccess")
          : t("savePasswordSuccess"),
        AlertVariant.success,
      );
      refresh();
    } catch (error) {
      addError(
        isResetPassword ? "resetPasswordError" : "savePasswordError",
        error,
      );
    }

    onClose();
  };

  return (
    <>
      <Modal
        title={t("resetPasswordFor", { username: user.username })}
        isOpen={confirm}
        onClose={onClose}
        variant={ModalVariant.small}
        actions={[
          <Button
            id="modal-confirm"
            data-testid="confirm"
            key="confirm"
            isDisabled={!isValid}
            variant={ButtonVariant.primary}
            onClick={() => {
              form.handleSubmit((data) => {saveUserPassword(data)})
            }}
          >
            {t("save")}
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

        ]}
      >
        <Form>
          <ToznyPasswordBrokerFields realm={realm!} />
          <FormGroup
            label={t("testConnectionRedirectURI")}
            labelIcon={
              <HelpItem helpText={t("testConnectionRedirectURIHelp")} fieldLabelId="testConnectionRedirectURI" />
            }
            fieldId="kc-reset-password-uri"
          >
            <ClipboardCopy
              isReadOnly
            >{resetLink}</ClipboardCopy>
          </FormGroup>
        </Form>
      </Modal>
      {/* <ConfirmSaveModal />
      <ConfirmDialogModal
        titleKey={
          isResetPassword
            ? t("resetPasswordFor", { username: user.username })
            : t("setPasswordFor", { username: user.username })
        }
        open={confirm}
        onCancel={onClose}
        toggleDialog={toggle}
        onConfirm={toggleConfirmSaveModal}
        confirmButtonDisabled={!isValid}
        continueButtonLabel="save"
      >
        <Form
          id="userCredentials-form"
          isHorizontal
          className="keycloak__user-credentials__reset-form"
        >
          <FormGroup
            name="password"
            label={t("password")}
            fieldId="password"
            isRequired
          >
            <PasswordInput
              data-testid="passwordField"
              id="password"
              onChange={(e) => {
                onChange(e);
                if (passwordConfirmation !== e.currentTarget.value) {
                  setError("passwordConfirmation", {
                    message: t("confirmPasswordDoesNotMatch").toString(),
                  });
                } else {
                  clearErrors("passwordConfirmation");
                }
              }}
              {...rest}
            />
            {errors.password && <FormErrorText message={t("required")} />}
          </FormGroup>
          <FormGroup
            name="passwordConfirmation"
            label={
              isResetPassword
                ? t("resetPasswordConfirmation")
                : t("passwordConfirmation")
            }
            fieldId="passwordConfirmation"
            isRequired
          >
            <PasswordInput
              data-testid="passwordConfirmationField"
              id="passwordConfirmation"
              {...register("passwordConfirmation", {
                required: true,
                validate: (value) =>
                  value === password ||
                  t("confirmPasswordDoesNotMatch").toString(),
              })}
            />
            {errors.passwordConfirmation && (
              <FormErrorText
                message={errors.passwordConfirmation.message as string}
              />
            )}
          </FormGroup>
          <FormProvider {...form}>
            <DefaultSwitchControl
              name="temporaryPassword"
              label={t("temporaryPassword")}
              labelIcon={t("temporaryPasswordHelpText")}
              className="pf-v5-u-mb-md"
              defaultValue="true"
            />
          </FormProvider>
        </Form>
      </ConfirmDialogModal> */}
    </>
  );
};
