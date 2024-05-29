import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { response } from "express";
import exp from "constants";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadcloud = async (localFilePath)=>{
    try{
        if(!localFilePath) return null
        //uploading file in cloudinary
        
            const res = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            })
        
        // file uploaded on cloudinary
        console.log("File uploaded on Cloudinary",
        response.url);
        fs.unlinkSync(localFilePath)
        return res;

    }catch(error){
        fs.unlinkSync(localFilePath)
        return null;
    }
}

// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });

export {uploadcloud}