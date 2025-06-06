import { fetchWithError } from "@keycloak/keycloak-admin-client";
import { environment } from "../../environment";
import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation";
import { reset } from "cbor/types/lib/tagged";

export type RetrievePasswordLinkResponse = {
  note_id: string;
  otp: {
    password: string;
  }
};

export type TozUserRegisterResponse = {
  response: { status: any; } | undefined;
  customMessage: string;
};
export class TozUser {

  private realm: RealmRepresentation
  private tozIDRealm : any

  constructor(realm: RealmRepresentation){
    this.realm = realm
    this.tozIDRealm = new Tozny.identity.Realm(
      realm?.realm,
      "account",
      realm?.attributes?.["recoverUri"],
      realm?.attributes?.["apiHost"]
    );
  }
  /**
     * Validates that one of the recovery methods is active, or throws to find the catch block in the promise chain.
     */
   private recoveryActive(actionName : string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined) {
    if (!(emailRecoveryExpirationMinutes || adminRecoveryExpirationMinutes)) {
      let err = new Error("No active recovery method")
      err.message = "One of the recovery methods (admin link or email) must have a valid expiry before " + actionName + "."
      throw err;
    }
  }


  private async retrievePasswordLink(username: string, adminRecoveryExpirationMinutes: number | undefined, realm: RealmRepresentation | undefined) : Promise<[string, string?]> {
    const reqURL = environment.authUrl + "/realms/" + realm?.realm + "/password/reset?user=" + encodeURIComponent(username)
    try {
        const response = await fetchWithError(
            reqURL,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                expires_minutes: adminRecoveryExpirationMinutes ?? 10,
              })
            })
        const responseJson : RetrievePasswordLinkResponse = await response.json()
        const resetLink = `${realm?.attributes?.["recoverUri"]}?note_id=${responseJson.note_id}&tozny_otp=${responseJson.otp.password}`;
        console.log("RESET LINK: %s", resetLink)
        return [resetLink]
      } catch(err : any){
        return ["", `Unable to generate admin reset link: ${err.message}`]
      }
  }

   private async sendResetEmail(username: string, template : string, emailRecoveryExpirationMinutes : number | undefined) : Promise<[string, boolean]>{
    // if recovery minutes is empty, do not perform this action
    if (!emailRecoveryExpirationMinutes) {
        return ["", false];
    }
    // Return the promise from initiateRecovery
    try{
      await this.tozIDRealm.initiateRecovery(
        username,
        {
            template_name: template,
            expiry_minutes: emailRecoveryExpirationMinutes ?? 10,
        })

    } catch(err: any){
      if (err.response !== undefined) {
        let statusCode = err.response.status
        if (statusCode == 500 || statusCode == 502) {
            return ["The password reset email was unable to be sent. It may require you to enable the 'Email Recovery' toggle in the tozny dashboard.", false]
        }
        return [err.message, false]
      }
    }
    return ["Password reset email requested for " + username + ".", true]
  }

   private async sendPasswordRecovery(username: string, action: string, template = "password_reset", emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined) : Promise<[string, string, boolean]> {

      this.recoveryActive(action, emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
      const [resetLink, retrievePasswordLinkError] = await this.retrievePasswordLink(username, adminRecoveryExpirationMinutes, this.realm)
      const [sendResetEmailMessage, sendRestEmailSuccess ] = await this.sendResetEmail(username, template, emailRecoveryExpirationMinutes)

      const wasSuccessful = !retrievePasswordLinkError && sendRestEmailSuccess
      const messages =  [retrievePasswordLinkError, sendResetEmailMessage]
      return [resetLink, messages.filter(String).join("\n") , wasSuccessful]
  }

  async CreateUser(username: string, email: string, firstName: string, lastName: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined){
    //Custom TozID Code
    const regToken = this.realm.attributes?.["registrationToken"]
    // instantiate tozID client
    this.recoveryActive("creating an identity", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
    const password = await Tozny.crypto.randomKey()
    //TODO: Add Attributes and Groups
    try{
      const toznyUser = await this.tozIDRealm.register(username, password, regToken, email, firstName, lastName)
      const [resetLink, message, sendPasswordRecoverySuccess] = await this.sendPasswordRecovery(username, "provisioning an identity", "claim_account", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
      return [toznyUser, resetLink, message, sendPasswordRecoverySuccess]
    }
    catch( error: any) {
      if (error.response !== undefined) {
        let statusCode = error.response.status
        if (statusCode == 409) {
          error.customMessage = "Sorry, the user " + email + " already exists."
        } else if (statusCode == 401) {
          error.customMessage = "Please provide a valid registration token"
        }
      }
      throw error
    }
  }

  async ResetPassword(username: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined, setResetLink: (resetLink: string) => void){

    this.sendPasswordRecovery(username, "resetting a password", "password_reset", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
        .then(message => {
            const successMessage = "Password reset complete for " + username + ": " + message;
            //Send Success
        })
        .catch((err) => {
            //displayBrokerError(err);
            // Force re-render... this does not like displaying messages in this context
        });
}

}
