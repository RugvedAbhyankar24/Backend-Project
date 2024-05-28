import { asyncHandler } from "../utils/asynchandler.js";

const registeruser = asyncHandler (async(req,res)=>{

    res.status(200).json({
        message:'OK'
    })
})

export {registeruser, }