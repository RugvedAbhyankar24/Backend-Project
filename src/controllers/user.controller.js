import { asyncHandler } from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiErrors.js"
import { User } from "../models/user.model.js";
import {uploadcloud} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const registeruser = asyncHandler (async(req,res)=>{

    // res.status(200).json({
    //     message:'OK'
    // })  // just for understanding testing through Postman

    //Registering a user
// 1. Get user details from frontend (can be also taken using postman)
// 2. Validation of details(empty field or not)
// 3. Check if user already exist(can be checked using email or username)
// 4. Check for images,check for avatar(files)
// 5. If available upload to cloudinary,check avatar
// 6. create user object- create entry in db
// 7. Remove password and refresh token from response
// 8. Check for user creation if user is created
// 9. return res else give error

// Get user details from frontend (can be also taken using postman)
    const {fullName,email,username,password}=req.body
    console.log("Email:",email);

    // if(fullName ===""){
    //     throw new ApiError(400,"Fullname is required")
    // } //For each field we can do similar

// Validation of details(empty field or not)

    if([fullName,email,username,password].some((field)=>
    field?.trim()==="")){
        throw new ApiError(400, "All fields are required")
    }

// Check if user already exist(can be checked using email or username)
 const existeduser= await User.findOne({
    $or:[{username},{email}]
})
if(existeduser){
    throw new ApiError(409,"Email or username already exists")
}

// Check for images,check for avatar(files)
const avatarLocalPath = req.files?.avatar[0]?.path;

//const coverImageLocalPath = req.files?.coverImage[0]?.path;
//Above can also be checked using normal if case array classic method

let coverImageLocalPath;
if(req.files &&Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path
}
if (!avatarLocalPath){
    throw new ApiError(400, "Avatar not found")
}

//If available upload to cloudinary,check avatar

const avatar = await uploadcloud(avatarLocalPath)
const coverImage = await uploadcloud(coverImageLocalPath)

if(!avatar){
    throw new ApiError(400, "Avatar not found")
}

//create user object- create entry in db
 const user= await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
 })

 //Check for user creation if user is created & Remove password and refresh token from response
 const Useriscreated= await User.findById(user._id).select(
    "-password -refreshtoken"
 )

 if(!Useriscreated){
    throw new ApiError(500, "Something went wrong while registering user")
 }

 //return res final
 return res.status(201).json(
    new ApiResponse(200,Useriscreated,"User registered Successfully!!!")
 )
})
export {registeruser, }