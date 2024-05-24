class ApiError extends Error {
    constructor(statusCode,data,message="Success"
    ){
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=statusCode < 400
    }

}