import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import type { UserProfileMetadata } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata";
import {
  isUserProfileError,
  setUserProfileServerError,
  useAlerts,
  useFetch,
} from "@keycloak/keycloak-ui-shared";
import { Alert, AlertVariant, PageSection } from "@patternfly/react-core";
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


import "./user-section.css";
import { TozUser } from "./utils/TozUser";

// Toz customized this file.

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
  const [loading, setLoading] = useState(false);
  const tozUser = new TozUser(realm!)

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

  const save = async (data: UserFormFields) => {
    setLoading(true)
    //Custom TozID Code
    const username = data.username!.toLowerCase().trim();

    // instantiate tozID client
    try{
      let groups: string[] = []
      addedGroups.map((group)=>{
        groups.push(group.path!)
      })
      const [toznyUser, resetLink, message, success] = await tozUser.CreateUser(username, data.email!, data.firstName!, data.lastName!, data.authentication?.emailRecoveryExpirationMinutes,data.authentication?.adminRecoveryExpirationMinutes, groups)
      const encodedLink = encodeURIComponent(resetLink)
      if (success){
        addAlert(t("userCreated"), AlertVariant.success);
      } else {
        addAlert(t("userCreatedWarning", {message}), AlertVariant.warning)
      }
      setLoading(false)
      navigate(
        toUser({ id: toznyUser.config.keycloakUserId, realm: realmName, tab: "credentials" }, `reset_link=${encodedLink}`),
      );
    } catch(error) {
      if (isUserProfileError(error)) {
        setUserProfileServerError(error, form.setError, ((key, param) =>
          t(key as string, param as any)) as TFunction);
      } else {
        addError("userCreateError", error);
      }
    };
    setLoading(false)
    //End Custom TozID Code
  };

  if (!realm || !userProfileMetadata || loading) {
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
