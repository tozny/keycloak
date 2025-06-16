import { ActionGroup, Button, ButtonVariant, Divider, Flex, FlexItem, Form, Label, List, ListItem, Modal, ModalVariant, PageSection, Text ,TextContent, TextVariants, Title } from "@patternfly/react-core"
import { QRCodeSVG } from "qrcode.react"
import { KeycloakSpinner, TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import Page from "../../page/Page";
import { TozMFA } from "../utils/TozMfa";
import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation";
import UserRepresentation from "libs/keycloak-admin-client/lib/defs/userRepresentation";
import TotpForm from "./TotpForm";
import useToggle from "../../utils/useToggle";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";


type TotpPolicy = {
    type : string;
    algorithm : string;
    initialCounter : number;
    digits : number;
    lookAheadWindow : number;
    period : number;
    algorithmKey : string;
    supportedApplications : string[]
}

type Totp = {
  type : string;
  secret : string;
  qrCode : string;
  policy : TotpPolicy
}

type AddMfaDialogProps = {
  user: UserRepresentation;
  refresh: () => void;
  onClose: () => void;
};

export const AddMfaDialog = ({
    user,
    refresh,
    onClose
  }: AddMfaDialogProps) => {
    const { t } = useTranslation();
    const { realmRepresentation: realm } = useRealm();
    const [totp, setTotp] = useState<Totp | null>(null);
    const tozMfa = new TozMFA(realm!, user.id!);
    const [confirm, toggle] = useToggle(true);
    const { adminClient } = useAdminClient();

    useEffect(() => {
        const loadTotp = async () => {
            let accessToken = await adminClient.getAccessToken()
            let totpResult = await tozMfa.InitiateTotp(accessToken!);
            setTotp(totpResult);
        }
        loadTotp()
    }, [])



    if (!totp) return <KeycloakSpinner />;
    return (
        <>
        <Modal
            title={"Add MFA"}
            isOpen={confirm}
            onClose={onClose}
            variant={ModalVariant.large}>
            <PageSection>
                <Title headingLevel="h2">
                    <Text>OTP</Text>
                </Title>
                <List component="ol" className="col-md-12 leading-spacious">
                    <ListItem>
                        <Text component={TextVariants.p}>Install one of the following applications on your mobile:</Text>
                        <List>
                            {/* NEED TO USE  totp.policy && totp.policy.supportedApplications FOR THIS*/}
                            <ListItem>FreeOTP</ListItem>
                            <ListItem>Google Authenticator</ListItem>
                        </List>
                    </ListItem>
                    <ListItem>
                        <Text component={TextVariants.p}>Open the application and scan the QR code or manually configure</Text>
                    <Flex direction={{ default: 'row' }} className="totp-block" spaceItems={{ default: 'spaceItemsLg' }}>
                        {/* Scan Block */}
                        <FlexItem className="scan-block">
                            <Title headingLevel="h3">Scan the QR Code</Title>
                            {totp.qrCode && (
                                <QRCodeSVG value={totp.qrCode} bgColor="#aeaeae" size={230}></QRCodeSVG>
                            )}
                        </FlexItem>

                        {/* Divider (vertical rule) */}
                        <Divider orientation={{ default: 'vertical' }} />

                        {/* Manual Block */}
                        <FlexItem className="manual-block">
                            <Title headingLevel="h3">Manual Configuration</Title>
                            <div>
                            <Label>Secret Key</Label>
                            <div className="pf-c-form-control">
                                <Text>{totp.secret}</Text>
                            </div>

                            {totp.policy && (
                                <>
                                <Text component={TextVariants.p}>
                                    Type: <strong>{totp.policy.type === 'totp' ? 'Time Based' : totp.policy.type}</strong>
                                </Text>
                                <Text component={TextVariants.p}>
                                    Algorithm: <strong>{totp.policy.algorithmKey}</strong>
                                </Text>
                                <Text component={TextVariants.p}>
                                    Digits: <strong>{totp.policy.digits}</strong>
                                </Text>
                                <Text component={TextVariants.p}>
                                    Interval: <strong>{totp.policy.period}</strong>
                                </Text>
                                </>
                            )}
                            </div>
                        </FlexItem>
                    </Flex>
                    </ListItem>
                    <ListItem>
                        <TotpForm totp={totp} tozMfa={tozMfa}/>
                    </ListItem>
                </List>
            </PageSection>
            <PageSection>
                <Title headingLevel="h2">
                    <Text>Authentication Token</Text>
                </Title>
            </PageSection>
        </Modal>
        </>
    )
}
