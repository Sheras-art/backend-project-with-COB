import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating Access and Refresh Tokens"
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
  // check user by username or email
  // findi user
  // if user exists check the password
  // if password is correct then generate Access and Refresh Tokens
  // and also send them to user in cookies

  const { username, email, password } = req.body;

  if (!username || !email) {
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

  const loggedInUser = await User.findById(user._id);
  select("-password -refreshToken");

  const options = {
    httponly: true,
    secure: true,
  };

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
    $set: {
      refreshToken: undefined,
    },
  });
  const options = {
    httponly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User Logged Out"))
});

export { registerUser, LoginUser, logoutUser };