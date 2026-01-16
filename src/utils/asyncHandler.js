const asyncHandler = (requestHandler) => {
  return (req, resp, next) => {
    Promise.resolve(requestHandler(req, resp, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// Explaination

// So, while creating our controllers we make async functions because in controllers we will write logic for browser, server and DataBase
// And no doubt error can generate during these async function and these type of errors called an async errors.

// Async errors happen when something goes wrong inside an asynchronous function.
// In JavaScript, async functions are usually functions that return Promises, either because you use async/await or .then()/.catch().

// If User.findById(id) fails (maybe invalid ID or database error), it throws an error inside the async function.
// This is an async error because it happens in the asynchronous part of your code.

// If findById fails, the error is inside the promise returned by the async function.
// Express cannot automatically catch errors from Promises unless you either:
// Wrap it in try/catch
// Use a helper like asyncHandler
// Without handling, the server may crash or the request will hang forever.

// So, that's why we use asynchandler to catch the async errors generated inside the returned promises of our async functions 
// and then we can debugg them.

// We will handle the req and resp in requestHandler/in our controller
// Here the job of asynchandler is just catch the error and through it to our express error handler 
// (err, req, res, next) <- this (err) is the express error handler