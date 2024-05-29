import { asyncHandler } from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiErrors.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generatedAccessTokenAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken= refreshToken
        await user.save({validateBeforeSave: false})

        return{accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong generating refresh and access tokens")
    }
}
const registerUser = asyncHandler (async(req,res)=>{

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

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

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
 const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"
 )

 if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering user")
 }

 //return res final
 return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Successfully!!!")
 )
})



const loginUser = asyncHandler (async(req,res)=>{

// 1. Take data from req.body
// 2. check username or email
// 3. Find user 
// 4. Check usr exist or not
// 5. password check
// 6. if wrong access or ref token are generated
// 7. send this tokens through secure cookies

const {email,username,password}=req.body
console.log(email);
if(!username && !email){
    throw new ApiError(400,"Username or password is required")
}

const user= await User.findOne({
    $or:[{username},{email}]
})

if(!user){
    throw new ApiError(404, "User does not exist")
}

const isPasswordValid= await user.isPasswordCorrect(password)

if(!isPasswordValid){
    throw new ApiError(401,"Password Incorrect")
}

//creating access & refresh tokens
const {accessToken,refreshToken}=await generatedAccessTokenAndRefreshToken(user._id)

const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

const options={
    httpOnly: true,
    secure:true
}

return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
.json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,
            refreshToken
        },
        "User logged in Successfully"
    )
)
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1
            }
        },
        {
            new:true
        }
     )

     const options={
        httpOnly: true,
        secure:true
    }
    
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged out Successfully"
        )
    )
})
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generatedAccessTokenAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage, }