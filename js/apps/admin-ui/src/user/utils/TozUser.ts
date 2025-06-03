import { fetchWithError } from "@keycloak/keycloak-admin-client";
import { environment } from "../../environment";
import RealmRepresentation from "libs/keycloak-admin-client/lib/defs/realmRepresentation";

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


  private async retrievePasswordLink(username: string, adminRecoveryExpirationMinutes: number | undefined, realm: RealmRepresentation | undefined) {
    // if realm name is empty, do not perform this action
    if (!adminRecoveryExpirationMinutes || !realm?.realm) {
        return;
    }
    const reqURL = environment.authUrl + "/realms/" + realm?.realm + "/password/reset?user=" + encodeURIComponent(username)
    await fetchWithError(
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
        .then((response) => response.json())
        .then(data => {
          //TODO: NEED TO SET THIS TO SEOMTHING IN THE FRONT END
            const resetLink = `${realm?.attributes?.["recoverUri"]}?note_id=${data.note_id}&tozny_otp=${data.otp.password}`;
            console.log("RESET LINK: %s", resetLink)
            return "Admin recovery link generated successfully."
        })
        .catch((err) => {
            err.customMessage = "Unable to generate admin reset link: " + err.message
            return err
        });
  }

   private sendResetEmail(username: string, template : string, emailRecoveryExpirationMinutes : number | undefined) {
    // if recovery minutes is empty, do not perform this action
    if (!emailRecoveryExpirationMinutes) {
        return;
    }
    // Return the promise from initiateRecovery
    return this.tozIDRealm.initiateRecovery(
        username,
        {
            template_name: template,
            expiry_minutes: emailRecoveryExpirationMinutes ?? 10,
        },
    )
        .then(() => "Password reset email requested for " + username + ".")
        .catch((err: any) => {
            console.log(err)
            if (err.response !== undefined) {
                let statusCode = err.response.status
                if (statusCode == 500 || statusCode == 502) {
                    err.isWarning = true
                    err.customMessage = "The password reset email was unable to be sent. It may require you to enable the 'Email Recovery' toggle in the tozny dashboard."
                    err.showHelpBlock = true
                }
            }
            // Return the error to accumulate as needed later
            return err
        })
  }

   private sendPasswordRecovery(username: string, action: string, template = "password_reset", emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined) {
    return Promise.resolve()
      //.then(() => clearRecoveryScope())
      .then(() => this.recoveryActive(action, emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes))
      .then(() => {
        return Promise.all([
          this.retrievePasswordLink(username, adminRecoveryExpirationMinutes, this.realm),
          this.sendResetEmail(username, template, emailRecoveryExpirationMinutes),
        ])
          .then(result => {
            // If the reset link was set, display it.
            // if ($scope.resetLink) {
            //   $scope.resetLinkBlockActive = true;
            // }
            const allErrors = result.filter(r => r instanceof Error);
            const nonErrors = result.filter(r => !(r instanceof Error));
            const resultMessage = nonErrors.filter(r => r).join("\n");
            // If there were no error, return the success messages
            if (allErrors.length === 0) {
              return resultMessage
            }
            // At least one error was reported - accumulate errors into a final error
            const finalError = new Error()
            finalError.message = resultMessage + " However Some recovery requests did not complete successfully: \n";
            //finalError.isWarning = true;
            // consolidate reported errors
            finalError.message += allErrors
              .filter(err => err.message)
              .map(err => err.message)
              .join("\n");
            //finalError.showHelpBlock = allErrors.some(err => err.showHelpBlock);
            // Throw to reject with the final accumulated error
            throw finalError;
          })
      })
  }

  CreateUser(username: string, email: string, firstName: string, lastName: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined){
    //Custom TozID Code
    const regToken = this.realm.attributes?.["registrationToken"]
    // instantiate tozID client
    return Promise.resolve()
    .then(() => this.recoveryActive("creating an identity", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes))
    .then(() => Tozny.crypto.randomKey())
    .then((password) => {
      //TODO: Add Attributes and Groups
      return this.tozIDRealm.register(username, password, regToken, email, firstName, lastName)
        .catch((error: { response: { status: any; } | undefined; customMessage: string; }) => {
          if (error.response !== undefined) {
            let statusCode = error.response.status
            if (statusCode == 409) {
              error.customMessage = "Sorry, the user " + email + " already exists."
            } else if (statusCode == 401) {
              error.customMessage = "Please provide a valid registration token"
            }
          }
          throw error
        })
    })
    .then(() => this.sendPasswordRecovery(username, "provisioning an identity", "claim_account", emailRecoveryExpirationMinutes, adminRecoveryExpirationMinutes))
  }

  ResetPassword(username: string, emailRecoveryExpirationMinutes: number | undefined, adminRecoveryExpirationMinutes: number | undefined){

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
