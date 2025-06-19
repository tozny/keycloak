import { AlertVariant, Divider, Flex, FlexItem, Label, List, ListItem, Modal, ModalVariant, PageSection, Text ,TextVariants, Title } from "@patternfly/react-core"
import { QRCodeSVG } from "qrcode.react"
import { KeycloakSpinner, useAlerts } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import { TozMFA } from "../utils/TozMfa";
import UserRepresentation from "libs/keycloak-admin-client/lib/defs/userRepresentation";
import TotpForm from "./TotpForm";
import useToggle from "../../utils/useToggle";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useEffect, useState } from "react";
import { useAdminClient } from "../../admin-client";
import { NetworkError } from "@keycloak/keycloak-admin-client";


type TotpPolicy = {
    type : string;
    algorithm : string;
    initialCounter : number;
    digits : number;
    lookAheadWindow : number;
    period : number;
    algorithmKey : string;
}

type Totp = {
  type : string;
  secret : string;
  qrCode : string;
  policy : TotpPolicy
  supportedApplications : string[]
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
    const [addedMfa, setAddedMfa] = useState(false)
    const { adminClient } = useAdminClient();
    const { addError } = useAlerts();

    useEffect(() => {
        const loadTotp = async () => {
            try{
                const accessToken = await adminClient.getAccessToken()
                const initiateResponse = await tozMfa.InitiateTotp(accessToken!);
                const initiateResponseData = await initiateResponse.text();
                const totpJson = JSON.parse(initiateResponseData)
                setTotp(totpJson);
            } catch (err){
                if (err instanceof NetworkError){
                    addError(`Unable to initialize TOTP: ${err.message}`, AlertVariant.danger)
                }
                if (err instanceof SyntaxError){
                    addError(`Unable to parse initialize TOTP result: ${err.message}`, AlertVariant.danger)
                }
            }
        }
        loadTotp()
    }, [])

    function checkAddedMfaBeforeClose(){
        if(addedMfa){
            refresh()
        }
        onClose()
    }


    if (!totp) return <KeycloakSpinner />;
    return (
        <>
        <Modal
            title={"Add MFA"}
            isOpen={confirm}
            onClose={checkAddedMfaBeforeClose}
            variant={ModalVariant.large}>
            <PageSection>
                <Title headingLevel="h2">
                    <Text>Authenticator App</Text>
                </Title>
                <Divider orientation={{ default: 'horizontal' }} />
                <List component="ol" className="col-md-12 leading-spacious">
                    <ListItem>
                        <Text component={TextVariants.p}>Install one of the following applications on your mobile:</Text>
                        {totp.supportedApplications && (<List>
                            {totp.supportedApplications.map((item) =>(
                                <ListItem>
                                    <Text component={TextVariants.p}>{t(item)}</Text>
                                </ListItem>
                            ))}
                        </List>)}
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
                        <TotpForm totp={totp} tozMfa={tozMfa} adminClient={adminClient} onSuccess={setAddedMfa}/>
                    </ListItem>
                </List>
            </PageSection>
            <PageSection>
                <Title headingLevel="h2">
                    <Text>Security Key Authentication</Text>
                </Title>
                <Divider orientation={{ default: 'horizontal' }} />
            </PageSection>
        </Modal>
        </>
    )
}
