import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation"
import { ToznyMFAServices } from "./TozMfaServices";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

export class TozMFA {

    private realm: RealmRepresentation
    private userId: string


    constructor(realm: RealmRepresentation, userId: string){
        this.realm = realm
        this.userId = userId
    }



    async RegisterTotp(totp: any, totpCode: string, totpLabel: string, accessToken: string){

        if (!totpCode) {
           throw Error("missingTotpCode")
          }
          if (!totp || !totp.secret) {
            throw Error("missingSecretKey")
          }
          totpLabel = totpLabel && totpLabel.trim() ? totpLabel.trim() : 'totp';

          return await ToznyMFAServices.registerTotp({
            realm: this.realm.realm!,
            userId: this.userId,
            accessToken: accessToken
          }, {
            totp: totpCode,
            secret: totp.secret,
            userLabel: totpLabel
          })
    }

    async InitiateTotp(accessToken: string){
        return await ToznyMFAServices.initiateTotp({
            realm: this.realm.realm!,
            userId: this.userId,
            accessToken: accessToken
          },
        );
    }

    async InitiateWebauthn(webauthnLabel: string, accessToken: string){
        const initiateResponse = await ToznyMFAServices.initiateWebauthn({
            realm: this.realm.realm!,
            userId: this.userId,
            accessToken: accessToken
          }
        );
        const initiateResponseData = await initiateResponse.text();
        const initiateWebauthnJson = JSON.parse(initiateResponseData)
        console.log(initiateWebauthnJson)
        await this.registerWebauthnDevice(initiateWebauthnJson, webauthnLabel, accessToken)
    }

    private async registerWebauthnDevice(webauthnChallengeResponse: any, webauthnLabel: string, accessToken: string) {
        if (!webauthnChallengeResponse) {
            throw new Error("missingChallengeData")
          }
          const challengeData = new Tozny.types.InitiateWebAuthnChallengeData(
            webauthnChallengeResponse.tab_id,
            webauthnChallengeResponse.login_context
          );
          console.log(challengeData)
          let registrationData;
          try {
            registrationData = await navigator.credentials.create({
              publicKey: challengeData.toPublicKeyCredentialCreationOptions(),
            })
          } catch (exception) {
            throw exception
          }


          await ToznyMFAServices.registerWebauthn({
              realm: this.realm.realm!,
              userId: this.userId,
              accessToken: accessToken
            }, {
              tab_id: webauthnChallengeResponse.tab_id,
              ...this.convertPublicKeyCredentialToRegistrationData(
                registrationData,
                webauthnLabel ?? "securitykey"
              )
            });
    }

    private convertPublicKeyCredentialToRegistrationData(
        publicKeyCredential : any,
        deviceName : string
      ) {
        const data = Tozny.types.InitiateWebAuthnChallengeData.convertPublicKeyCredentialToRegistrationData(publicKeyCredential, deviceName);
        console.log(data);
        return {
          clientDataJSON: data.client_data_json,
          attestationObject: data.attestation_object,
          publicKeyCredentialId: data.public_key_credential_id,
          authenticatorLabel: data.authenticator_label,
        }
      }
}
