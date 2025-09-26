import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  FileUpload,
  Form,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { HelpItem, TextControl, useAlerts } from "@keycloak/keycloak-ui-shared";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useRealm } from "../context/realm-context/RealmContext";
import { useAdminClient } from "../admin-client";
import { toUsers } from "./routes/Users";

import { TozUser } from "./utils/TozUser";

type FormData = {
  file: File | null;
  fileContent: string;
  brokerUrl: string;
};

export default function ImportUsers() {
  const { adminClient } = useAdminClient();
  const { t } = useTranslation();
  const { addAlert, addError } = useAlerts();
  const { realmRepresentation: realm } = useRealm();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filename, setFilename] = useState("");
  const [isFileRejected, setIsFileRejected] = useState(false);
  const tozUser = new TozUser(realm!)

  const form = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      file: null,
      fileContent: "",
      brokerUrl: realm?.attributes?.["recoverUri"] ?? "",
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const file = watch("file");
  const fileContent = watch("fileContent");
  const brokerUrl = watch("brokerUrl");

  // If realm loads after first render, populate brokerUrl only when empty
  useEffect(() => {
    console.log("useeffect triggered")
    const uri = realm?.attributes?.["recoverUri"] ?? "";
    if (!brokerUrl && uri) {
      setValue("brokerUrl", uri, { shouldDirty: false });
    }
  }, [realm, brokerUrl]);

  const handleFileChange = (fileOrFiles: any) => {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    setFilename(file.name);
    setValue("file", file);
    setIsFileRejected(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setValue("fileContent", content);
    };
    reader.readAsText(file);
  };

  const handleFileRejected = () => {
    setIsFileRejected(true);
    setValue("file", null);
    setValue("fileContent", "");
  };

  const onSubmit = async (formData: FormData) => {
    if (!formData.file || !formData.fileContent) {
      return;
    }
    setIsSubmitting(true);
    try {
          let fileLines = formData.fileContent.split(/\r?\n/);
          let headerLine = fileLines[0]
          let providedHeaders: any = { "username": undefined, "password": undefined, "email": undefined, "firstname": undefined, "lastname": undefined }
          let headerFlags = headerLine.split(/,/);
          for (var i = 0; i < headerFlags.length; i++) {
              let header = headerFlags[i]
              if (header in providedHeaders) {
                  providedHeaders[header] = i
              }
          }
            if (!validateHeaders(providedHeaders)) {
                addError(t("userImportHeaderError"),"");
               //"File format is invalid, username and password are required headers."
                return
            }

            let userLines
            if (fileLines[fileLines.length - 1] == "") {
                userLines = fileLines.slice(1, fileLines.length - 1) // remove header line and empty new line
            } else {
                userLines = fileLines.slice(1) // remove header line
            }

            // create users
            let resultMap: any = {}
            let result = userLines.reduce((prevPromise: any, nextUserLine: any) => {
                let userConfig = nextUserLine.split(/,/);
                let username = providedHeaders["username"] !== undefined ? userConfig[providedHeaders["username"]] : ""
                let password = providedHeaders["password"] !== undefined ? userConfig[providedHeaders["password"]] : ""
                let email = providedHeaders["email"] !== undefined ? userConfig[providedHeaders["email"]] : ""
                let firstName = providedHeaders["firstname"] !== undefined ? userConfig[providedHeaders["firstname"]] : ""
                let lastName = providedHeaders["lastname"] !== undefined ? userConfig[providedHeaders["lastname"]] : ""

                if (!username || !password) {
                    resultMap[username] = "Username or Password cannot be empty"
                    // $scope.bulkUserCurrent += 1
                   //  $scope.$apply();
                    return prevPromise
                }

                resultMap[username] = "success" // defaults to success, errors are caught and this message is over written
                return prevPromise.then(() => {
                    // $scope.bulkUserCurrent += 1
                    // $scope.$apply();
                    return createSingleUser(username, password, email, firstName, lastName)
                }).catch((error: any) => {
                    if (error.response !== undefined) {
                        let statusCode = error.response.status
                        if (statusCode == 409) {
                            resultMap[username] = "Sorry, the user already exists."
                        }
                        else if (statusCode == 401) {
                            resultMap[username] = "Please provide a valid registration token"
                        }
                        return
                    }
                    resultMap[username] = "Error: " + error.message
                })
            }, Promise.resolve())

            result.then(() => {
                // encode result map
                var results = Object.keys(resultMap).map(function (key) {
                    return key + "," + resultMap[key]
                }).join("\n")
                var downloadElement = document.createElement('a');
                downloadElement.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURI(results));
                downloadElement.setAttribute('download', 'bulkCreateResults.csv');
                document.body.appendChild(downloadElement);
                downloadElement.click();
                document.body.removeChild(downloadElement);
            })
      addAlert(t("usersImported"), AlertVariant.success);
    } catch (error) {
      addError("userImportError", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateHeaders = (providedHeaders: any) => {
        if (providedHeaders["username"] === undefined || providedHeaders["password"] === undefined) {
            return false
        }
        return true
    }

    const createSingleUser = (inputUsername: string, password: string, email: string, firstName: string, lastName: string) => {
        let username = inputUsername.toLowerCase()
        return tozUser.CreateUserWithPassword(username, password, email, firstName, lastName)
    };

  const fileUploadOptions = {
    accept: {
      'text/csv': ['.csv'],
    },
    maxSize: 10485760, // 10MB
    onDropRejected: handleFileRejected,
    onDrop: handleFileChange,
  };

  const clearFile = () => {
    setValue("file", null);
    setValue("fileContent", "");
    setFilename("");
    setIsFileRejected(false);
  };

  return (
    <>
      <ViewHeader titleKey="importUsers" subKey="" />
      <PageSection variant="light">
        <FormProvider {...form}>
          <Form isHorizontal onSubmit={handleSubmit(onSubmit)}>
            <TextControl
                name="brokerUrl"
                label={t("brokerUrl")}
                rules={{ required: t("required") }}
                labelIcon={t("brokerUrlHelp")}
            />
          <FormGroup
            label={t("fileUpload")}
            labelIcon={
              <HelpItem helpText={t("importLocalUsersHelp")} fieldLabelId="userUploadHelp" />
            }
            fieldId="file"
            isRequired
          >
            <FileUpload
              id="file-upload"
              value={fileContent}
              filename={filename}
              filenamePlaceholder={t("dragAndDropFile")}
              browseButtonText={t("browse")}
              clearButtonText={t("clear")}
              dropzoneProps={fileUploadOptions}
              onClearClick={clearFile}
            />
            {isFileRejected && (
              <Alert
                variant="danger"
                isInline
                isPlain
                title={t("fileUploadError")}
                className="pf-v5-u-mt-sm"
              />
            )}
          </FormGroup>

          <FormGroup>
            <Stack hasGutter>
              <StackItem>
                <Button
                  variant={ButtonVariant.primary}
                  type="submit"
                  isDisabled={!file || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {t("import")}
                </Button>
                <Button
                  variant={ButtonVariant.link}
                  onClick={() => navigate(toUsers({ "realm": realm?.realm? realm.realm : "" }))}
                  isDisabled={isSubmitting}
                  className="pf-v5-u-ml-sm"
                >
                  {t("cancel")}
                </Button>
              </StackItem>
            </Stack>
          </FormGroup>
          </Form>
        </FormProvider>
      </PageSection>
    </>
  );
}
