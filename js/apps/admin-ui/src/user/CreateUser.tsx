import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import type { UserProfileMetadata } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata";
import {
  isUserProfileError,
  setUserProfileServerError,
  useAlerts,
  useFetch,
} from "@keycloak/keycloak-ui-shared";
import { AlertVariant, PageSection } from "@patternfly/react-core";
import { TFunction } from "i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { KeycloakSpinner } from "@keycloak/keycloak-ui-shared";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useRealm } from "../context/realm-context/RealmContext";
import { UserForm } from "./UserForm";
import { UserFormFields, toUserRepresentation } from "./form-state";
import { toUser } from "./routes/User";
import { Tozny } from '@toznysecure/sdk'
import { environment } from "../environment";


import "./user-section.css";
import { fetchWithError } from "libs/keycloak-admin-client/lib";

export default function CreateUser() {
  const { adminClient } = useAdminClient();

  const { t } = useTranslation();
  const { addAlert, addError } = useAlerts();
  const navigate = useNavigate();
  const { realm: realmName, realmRepresentation: realm } = useRealm();
  const form = useForm<UserFormFields>({ mode: "onChange" });
  const [addedGroups, setAddedGroups] = useState<GroupRepresentation[]>([]);
  const [userProfileMetadata, setUserProfileMetadata] =
    useState<UserProfileMetadata>();
  const tozIDRealm = new Tozny.identity.Realm(
      realmName,
      "account",
      realm?.attributes?.["recoverUri"],
      realm?.attributes?.["apiHost"]
    );

  useFetch(
    () => adminClient.users.getProfileMetadata({ realm: realmName }),
    (userProfileMetadata) => {
      if (!userProfileMetadata) {
        throw new Error(t("notFound"));
      }

      form.setValue("attributes.locale", realm?.defaultLocale || "");
      setUserProfileMetadata(userProfileMetadata);
    },
    [],
  );
  //Custom TozID Functions
  /**
     * Validates that one of the recovery methods is active, or throws to find the catch block in the promise chain.
     */
  function recoveryActive(actionName : string, data : UserFormFields) {
    if (!(data?.authentication?.emailRecoveryExpirationMinutes || data?.authentication?.adminRecoveryExpirationMinutes)) {
      let err = new Error("No active recovery method")
      err.message = "One of the recovery methods (admin link or email) must have a valid expiry before " + actionName + "."
      throw err;
    }
  }

  // function clearRecoveryScope() {
  //   $scope.resetLink = '';
  //   $scope.resetLinkBlockActive = false;
  //   $scope.resetHelp = '';
  //   $scope.resetHelpBlockActive = false;


  // }

  async function retrievePasswordLink(username: string) {
    // if recovery minutes is empty, do not perform this action
    if (!form.watch("authentication.adminRecoveryExpirationMinutes")) {
        return;
    }
    const reqURL = environment.authUrl + "/realms/" + realm?.realm + "/password/reset?user=" + encodeURIComponent(username)
    await fetchWithError(
        reqURL,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expires_minutes: form.watch("authentication.adminRecoveryExpirationMinutes") ?? 10,
          })
        })
        .then((response) => response.json())
        .then(data => {
          //TODO: NEED TO SET THIS TO SEOMTHING IN THE FRONT END
            const resetLink = `${realm?.attributes?.["recoverUri"]}?note_id=${data.note_id}&tozny_otp=${data.otp.password}`;
            console.log("RESET LINK: %s", resetLink)
            return "Admin recovery link generated successfully."
        })
        .catch((err) => {
            err.customMessage = "Unable to generate admin reset link: " + err.message
            return err
        });
  }

  function sendResetEmail(username: string, template : string, emailRecoveryExpirationMinutes : number | undefined) {
    // if recovery minutes is empty, do not perform this action
    if (!emailRecoveryExpirationMinutes) {
        return;
    }
    // Return the promise from initiateRecovery
    return tozIDRealm.initiateRecovery(
        username,
        {
            template_name: template,
            expiry_minutes: emailRecoveryExpirationMinutes ?? 10,
        },
    )
        .then(() => "Password reset email requested for " + username + ".")
        .catch((err: any) => {
            console.log(err)
            if (err.response !== undefined) {
                let statusCode = err.response.status
                if (statusCode == 500 || statusCode == 502) {
                    err.isWarning = true
                    err.customMessage = "The password reset email was unable to be sent. It may require you to enable the 'Email Recovery' toggle in the tozny dashboard."
                    err.showHelpBlock = true
                }
            }
            // Return the error to accumulate as needed later
            return err
        })
  }

  function sendPasswordRecovery(username: string, action: string, template = "password_reset", data : UserFormFields) {
    return Promise.resolve()
      //.then(() => clearRecoveryScope())
      .then(() => recoveryActive(action, data))
      .then(() => {
        return Promise.all([
          retrievePasswordLink(username),
          sendResetEmail(username, template, data.authentication?.emailRecoveryExpirationMinutes),
        ])
          .then(result => {
            // If the reset link was set, display it.
            // if ($scope.resetLink) {
            //   $scope.resetLinkBlockActive = true;
            // }
            const allErrors = result.filter(r => r instanceof Error);
            const nonErrors = result.filter(r => !(r instanceof Error));
            const resultMessage = nonErrors.filter(r => r).join("\n");
            // If there were no error, return the success messages
            if (allErrors.length === 0) {
              return resultMessage
            }
            // At least one error was reported - accumulate errors into a final error
            const finalError = new Error()
            finalError.message = resultMessage + " However Some recovery requests did not complete successfully: \n";
            //finalError.isWarning = true;
            // consolidate reported errors
            finalError.message += allErrors
              .filter(err => err.message)
              .map(err => err.message)
              .join("\n");
            //finalError.showHelpBlock = allErrors.some(err => err.showHelpBlock);
            // Throw to reject with the final accumulated error
            throw finalError;
          })
      })
  }

  //End Custom TozID Functions
  const save = async (data: UserFormFields) => {
    //Custom TozID Code
    //Custom TozID
    const regToken = realm?.attributes?.["registrationToken"]
    const username = data.username!.toLowerCase().trim();
    const email = data.email
    // instantiate tozID client
    Promise.resolve()
    .then(() => recoveryActive("creating an identity", data))
    .then(() => Tozny.crypto.randomKey())
    .then((password) => {
      //TODO: Add Attributes and Groups
      return tozIDRealm.register(username, password, regToken, email, data.firstName, data.lastName)
        .catch((error: { response: { status: any; } | undefined; customMessage: string; }) => {
          if (error.response !== undefined) {
            let statusCode = error.response.status
            if (statusCode == 409) {
              error.customMessage = "Sorry, the user " + email + " already exists."
            } else if (statusCode == 401) {
              error.customMessage = "Please provide a valid registration token"
            }
          }
          throw error
        })
    })
    .then(() => sendPasswordRecovery(username, "provisioning an identity", "claim_account", data))
    .then(message => {
      addAlert(t("userCreated"), AlertVariant.success);
    })
    .catch((err) => {
      addError("userCreateError", err);
      // if (err.isWarning) {
      //   err.customMessage = username + " was provisioned successfully, but there was an issue setting up password recovery. \n" + err.customMessage
      // }

    });
    // const createdUser = await adminClient.users.create({
    //   ...toUserRepresentation(data),
    //   groups: addedGroups.map((group) => group.path!),
    //   enabled: true,
    // });

    try {
      const createdUser = await adminClient.users.create({
        ...toUserRepresentation(data),
        groups: addedGroups.map((group) => group.path!),
        enabled: true,
      });

      addAlert(t("userCreated"), AlertVariant.success);
      navigate(
        toUser({ id: createdUser.id, realm: realmName, tab: "settings" }),
      );
    } catch (error) {
      if (isUserProfileError(error)) {
        setUserProfileServerError(error, form.setError, ((key, param) =>
          t(key as string, param as any)) as TFunction);
      } else {
        addError("userCreateError", error);
      }
    }
  };

  if (!realm || !userProfileMetadata) {
    return <KeycloakSpinner />;
  }

  return (
    <>
      <ViewHeader
        titleKey={t("createUser")}
        className="kc-username-view-header"
      />
      <PageSection variant="light">
        <UserForm
          form={form}
          realm={realm}
          userProfileMetadata={userProfileMetadata}
          onGroupsUpdate={setAddedGroups}
          save={save}
        />
      </PageSection>
    </>
  );
}
