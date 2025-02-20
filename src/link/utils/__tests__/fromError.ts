import { toPromise } from "../toPromise.js";
import { fromError } from "../fromError.js";

describe("fromError", () => {
  it("acts as error call", () => {
    const error = new Error("I always error");
    const observable = fromError(error);
    return toPromise(observable)
      .then(() => {
        throw "should not have thrown";
      })
      .catch((actualError) => expect(error).toEqual(actualError));
  });
});
