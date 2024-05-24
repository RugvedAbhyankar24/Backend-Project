import mongoose,{Schema, mongo} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema= new Schema(
    {
        username:{
            type:String,
            required: true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required: true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required: true,
            trim:true,
            index:true
        },
        avatar:{
            type:String, //extracted from cloud
            required: true,
        },
        coverimage:{
            type:String, //extracted from cloud
        },
        watchhistory:[{
            type: Schema.Types.ObjectId,
            ref: "video"
        }],
        password:{
            type:String,
            required:[true, 'Password is required']
        },
        refreshtoken:{
            type:String
        }
    },{timestamps:true}
)

userSchema.pre("save", async function(next){
    if(this.isModified("password")) return next();

    this.password=bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generatedAccessToken= function(){
    jwt.sign({
        _id:this._id,
        username:this.username,
        email:this.email,
        fullname:this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generatedRefreshToken= function(){
    userSchema.methods.generatedAccessToken= function(){
        jwt.sign({
            _id:this._id,
            username:this.username,
            email:this.email,
            fullname:this.fullname,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    }
}
export const User= mongoose.model("User",userSchema)