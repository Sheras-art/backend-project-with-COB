import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong, While generating Access and Refresh Tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, resp) => {
  // Here we will register our user by using roper logic building

  // get user details from frontend
  // validation like not empty fields
  // check if user already exists: by username or email
  // check for images, check for avatar
  // upload the images to cloudinary, avatar
  //  create user object - create entry in DB
  // remove password and refreshtoken field from response
  // check for user creation
  // return response

  // get user details from frontend
  const { fullname, email, username, password } = req.body;
  console.log("email :", email, req.files);

  // validation like not empty fields
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "") // some method returns true or false on given condition.
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists: by username or email
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  console.log(avatarLocalPath, coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload the images to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log(avatar, coverImage);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //  create user object - create entry in DB
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refreshtoken field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong, While creating user");
  }

  // return response
  return resp
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Sucessfully"));
});

const LoginUser = asyncHandler(async (req, resp) => {
  // get data from the user by req.body
  // find user by username or email
  // check user exist
  // if user exists check the password
  // if password is correct then generate Access and Refresh Tokens
  // and also send them to user in cookies

  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "user not registered/exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid user Details.");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log(accessToken, refreshToken);


  return resp
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1,
    },
  });
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.accessToken || req.body.accessToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(400, "Invalid refresh token")
    }

    if (!(incomingRefreshToken === user?.refreshToken)) {
      throw new ApiError(401, "Refresh token is expired or Used")
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

    const options = {
      httpOnly: true,
      secure: true
    }

    res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, {
        accessToken, newRefreshToken
      }, "Access Token Refreshed"))
  } catch (error) {
    throw new ApiError(201, error?.message || "Invalid refresh token")
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  // get old password and new password from req.body
  // validate both passwords are provided
  // get user from req.user._id
  // compare old password is correct or not
  // if not correct throw error
  // if correct set the new password
  // save the user
  // return success response

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  };

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  };

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false
  });

  res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, req.user, "Current user fetched successfully")
  );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!(fullname || email)) {
    throw new ApiError(400, "At least one field (fullname or email) is required");
  };

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullname: fullname,
        email: email
      }
    }, { new: true }
  ).select("-password");

  res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  };

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      avatar: avatar.url,
    }
  }, { new: true }).select("-password");

  res.status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));

});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Something went wrong while uploading cover image");
  };

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      coverImage: coverImage.url,
    }
  }, { new: true }).select("-password");

  res.status(200)
    .json(new ApiResponse(200, user, "User cover image updated successfully"));

});

export { 
  registerUser, 
  LoginUser, 
  logoutUser, 
  refreshAccessToken, 
  changeUserPassword, 
  getCurrentUser, 
  updateAccountDetails, 
  updateUserAvatar, 
  updateUserCoverImage };