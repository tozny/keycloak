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
  Flex,
  FlexItem,
  Form,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import { HelpItem, TextControl, useAlerts } from "@keycloak/keycloak-ui-shared";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useRealm } from "../context/realm-context/RealmContext";
import { useAdminClient } from "../admin-client";
import { toUsers } from "./routes/Users";
import { FileUploadForm } from "../components/json-file-upload/FileUploadForm";

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

  const handleFileChange = (file: any) => {
    console.log("File changed:", file)
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
      // TODO: Implement actual import logic here
      // This is a placeholder for the import functionality
      console.log("Importing users:", formData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      addAlert(t("usersImported"), AlertVariant.success);
    } catch (error) {
      console.error("Error importing users:", error);
      addError("userImportError", error);
    } finally {
      setIsSubmitting(false);
    }
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
            <FileUploadForm
              id={"userImportFile"}
              extension="csv"
              onChange={handleFileChange}
              helpText={t("importLocalUsersHelp")}
            >
            </FileUploadForm>
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
