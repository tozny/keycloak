import { fetchWithError, NetworkError, NetworkErrorOptions } from "@keycloak/keycloak-admin-client";
import { environment } from "../../environment";
import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation";
import { getAuthorizationHeaders } from "../../utils/getAuthorizationHeaders";

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
        const responseJson = await response.json()
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

  async CreateUser(username: string, email: string, firstName: string, lastName: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined, groups: string[]) : Promise<[any, string, string, boolean]>{
    //Custom TozID Code
    const regToken = this.realm.attributes?.["registrationToken"]
    // instantiate tozID client
    this.recoveryActive("creating an identity", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
    const password = await Tozny.crypto.randomKey()
    //TODO: Add Attributes and Groups
    try{
      const toznyUser = await this.tozIDRealm.register(username, password, regToken, email, firstName, lastName, undefined, undefined, groups)
      const [resetLink, message, sendPasswordRecoverySuccess] = await this.sendPasswordRecovery(username, "provisioning an identity", "claim_account", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
      return [toznyUser, resetLink, message, sendPasswordRecoverySuccess]
    }
    catch( error: any) {
      let returnError: NetworkErrorOptions = {response: error.response, responseData: {errorMessage:"We were unable to create an account for your user, please try again later."}}
      if (error.response !== undefined) {
        let statusCode = error.response.status
        if (statusCode == 409) {
          returnError.responseData = {errorMessage: `Sorry, the user ${email} already exists.`}
        } else if (statusCode == 401) {
          returnError.responseData = {errorMessage: "Please provide a valid registration token"}
        } else {
          try {
              const bodyString = await error.response.text();
              let bodyObj: any = JSON.parse(bodyString);
              if (typeof bodyObj === "string") {
                bodyObj = JSON.parse(bodyObj);
              }
              returnError.responseData = bodyObj;
            } catch (ex) {
              console.log(ex);
            }
        }
      }
      throw new NetworkError("", returnError)
    }
  }

  async CreateUserWithPassword(username: string, password: string, email: string, firstName: string, lastName: string) : Promise<[any, string, string, boolean]>{
    const regToken = this.realm.attributes?.["registrationToken"]
    return this.tozIDRealm.register(username, password, regToken, email, firstName, lastName, undefined, undefined, [])
  }

  async ResetPassword(username: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined){
    try{
      const [resetLink, message, sendPasswordRecoverySuccess] = await this.sendPasswordRecovery(username, "resetting a password", "password_reset", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes)
      if (sendPasswordRecoverySuccess){
        return [resetLink,  `Password reset complete for ${username}: ${message}`]
      }
    } catch (error){
      throw error
    }
    return ["", "Unable to send password recovery"]
}

  async getUserAccountLockStatus(userId: string | undefined, accessToken: string | undefined): Promise<Boolean | Error> {
     const reqURL = environment.authUrl + '/realms/' + this.realm?.realm + '/user/' + userId + '/account/status'
     try {
        const response: any = await fetchWithError(
            reqURL,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...getAuthorizationHeaders(accessToken)
              },
            });
        const data = await response.json()
        return data;
      } catch(err : any){
        return err
      }
  }

  async UnlockUserAccount(userId: string | undefined, accessToken: string | undefined): Promise<Boolean | Error> {
    const reqURL = environment.authUrl + '/realms/' + this.realm?.realm + '/user/' + userId + '/account/unlock'
    try {
        const response: any = await fetchWithError(
            reqURL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getAuthorizationHeaders(accessToken)
              },
            })
        return await response.json()
      } catch(err : any){
        return err
      }           
  }

  async DeleteUser(userId: string | undefined, accessToken: string | undefined) {
    const reqURL = environment.authUrl + '/realms/' + this.realm?.realm + '/user/' + userId
    try {
        const response: any = await fetchWithError(
            reqURL,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                ...getAuthorizationHeaders(accessToken)
              },
            })
        return response
    } catch(err : any){
       return err
    }
  }
}
