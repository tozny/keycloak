import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation"
import { ToznyMFAServices } from "./TozMfaServices";

export class TozMFA {

    private realm: RealmRepresentation
    private userId: string


    constructor(realm: RealmRepresentation, userId: string){
        this.realm = realm
        this.userId = userId
    }



    async RegisterTotp(totp: any, totpCode: string, totpLabel: string, accessToken: string){

        if (!totpCode) {
          console.log("totpCode:")
            //Notifications.error("One-time code is required.");
            return;
          }
          if (!totp || !totp.secret) {
            console.log("totp issue")
            //Notifications.error("Secret Key is required.");
            return;
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
        const initiateResponse = ToznyMFAServices.initiateWebauthn({
            realm: this.realm.realm!,
            userId: this.userId,
            accessToken: accessToken
          }
        );
        console.log(initiateResponse)
        this.registerWebauthnDevice(initiateResponse, webauthnLabel, accessToken)
    }

    private async registerWebauthnDevice(webauthnChallengeResponse: any, webauthnLabel: string, accessToken: string) {
        if (!webauthnChallengeResponse) {
            console.error('no challege data');
            throw new Error("No challege data")
          }
          const challengeData = new Tozny.types.InitiateWebAuthnChallengeData(
            webauthnChallengeResponse.tab_id,
            webauthnChallengeResponse.login_context
          );
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
