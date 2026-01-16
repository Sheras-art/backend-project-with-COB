class ApiError extends Error {
  constructor(
    statuscode,
    message = "Something Went Wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statuscode = statuscode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };

// Explaination

// Why we use extends Error?
// by using extends Error and then send our message to this class we are making our simple class to an JS error
// without using this the express will not detect the error as an actual error or we can get wrong error details
// which make problem while debugging

// what is constructor?
// constructor is use to tell the structure or pattern of data of the error like first we take statuscode then message then etc...

// super(message)?
// by using this super(message) we are making our simple class into an JS error by sending our message in Eroor parent classs