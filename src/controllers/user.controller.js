import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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
  console.log("email :", email);

  // validation like not empty fields
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "") // some method returns true or false on given condition.
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists: by username or email
  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload the images to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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

export { registerUser };