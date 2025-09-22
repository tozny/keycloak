import { useState } from "react";
import { useForm } from "react-hook-form";
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
  Radio,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from "@patternfly/react-core";
import { ExclamationCircleIcon } from "@patternfly/react-icons";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useRealm } from "../context/realm-context/RealmContext";
import { useAdminClient } from "../admin-client";
import { toUsers } from "./routes/Users";

type FormData = {
  file: File | null;
  fileContent: string;
  importType: "json" | "csv";
};

export default function ImportUsers() {
  const { adminClient } = useAdminClient();
  const { t } = useTranslation();
  const { addAlert, addError } = useAlerts();
  const { realm } = useRealm();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filename, setFilename] = useState("");
  const [isFileRejected, setIsFileRejected] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      importType: "json",
      file: null,
      fileContent: "",
    },
  });

  const file = watch("file");
  const fileContent = watch("fileContent");
  const importType = watch("importType");

  const handleFileChange = (file: File) => {
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
      navigate(toUsers({ realm }));
    } catch (error) {
      console.error("Error importing users:", error);
      addError("userImportError", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileUploadOptions = {
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
    },
    maxSize: 10485760, // 10MB
    onLoad: (event: ProgressEvent<FileReader>, file: File) =>
      handleFileChange(file),
    onFileReject: handleFileRejected,
  };

  const clearFile = () => {
    setValue("file", null);
    setValue("fileContent", "");
    setFilename("");
    setIsFileRejected(false);
  };

  return (
    <>
      <ViewHeader titleKey="importUsers" subKey="importUsersDescription" />
      <PageSection variant="light">
        <Form isHorizontal onSubmit={handleSubmit(onSubmit)}>
          <FormGroup
            label={t("fileType")}
            fieldId="importType"
            isRequired
          >
            <Stack hasGutter>
              <Radio
                id="json"
                name="importType"
                label={t("jsonFile")}
                isChecked={importType === "json"}
                onChange={() => setValue("importType", "json")}
              />
              <Radio
                id="csv"
                name="importType"
                label={t("csvFile")}
                isChecked={importType === "csv"}
                onChange={() => setValue("importType", "csv")}
              />
            </Stack>
          </FormGroup>

          <FormGroup
            label={t("fileUpload")}
            fieldId="file"
            isRequired
          >
            {errors.file && (
              <div className="pf-v5-c-form__helper-text pf-m-error">
                <span className="pf-v5-c-form__helper-text-icon">
                  <ExclamationCircleIcon />
                </span>
                {t("required")}
              </div>
            )}
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
                  onClick={() => navigate(toUsers({ realm }))}
                  isDisabled={isSubmitting}
                  className="pf-v5-u-ml-sm"
                >
                  {t("cancel")}
                </Button>
              </StackItem>
              <StackItem>
                <TextContent>
                  <Text component={TextVariants.small}>
                    {t("importUsersHelpText")}
                  </Text>
                </TextContent>
              </StackItem>
            </Stack>
          </FormGroup>
        </Form>
      </PageSection>
    </>
  );
}
