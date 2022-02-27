const Error=class {
    constructor(status,message){
        this.message=message;
        this.status=status;
    }
}
module.exports={Error}