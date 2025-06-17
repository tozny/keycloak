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

        if (totpCode) {
          console.log("totpCode")
            //Notifications.error("One-time code is required.");
            return;
          }
          if (!totp || !totp.secret) {
            console.log("totp issue")
            //Notifications.error("Secret Key is required.");
            return;
          }
          console.log("THIS IS THE TOTP CODE: " + totpCode)
          totpLabel = totpLabel && totpLabel.trim() ? totpLabel.trim() : 'totp';
          try {
            console.log("getting response")
            const registerResponse = await ToznyMFAServices.registerTotp({
              realm: this.realm.realm!,
              userId: this.userId,
              accessToken: accessToken
            }, {
              totp: totpCode,
              secret: totp.secret,
              userLabel: totpLabel
            })
            console.log(registerResponse)
          } catch (err){
            console.log(err)
          }
          // ToznyMFAServices.registerTotp({
          //     realm: this.realm.realm,
          //     userId: this.userId
          //   }, {
          //     totp: totpCode,
          //     secret: totp.secret,
          //     userLabel: totpLabel
          //   },
          //   function (response) {
          //     console.log(response);
          //     Notifications.success("Successfully registered credential");
          //     const path = `realms/${realm.realm}/users/${user.id}`;
          //     $location.url(path);
          //   },
          //   function (err) {
          //     Notifications.error(
          //       $translate.instant("user.credential.fetch.error")
          //     );
          //     console.log(err);
          //   }
          // );
    }

    async InitiateTotp(accessToken: string){
        return await ToznyMFAServices.initiateTotp({
            realm: this.realm.realm!,
            userId: this.userId,
            accessToken: accessToken
          },
        );
        // if ($scope.totp.qrCode) {
        //     $scope.qrcodeText = $scope.totp.qrCode;
        //   }
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
        if (webauthnChallengeResponse) {
            console.error('no challege data');
            //Notifications.error("No Challenge data found! Please try again.");
            return;
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
            console.error(exception);
            return;
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
