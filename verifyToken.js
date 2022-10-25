import jwt from 'jsonwebtoken'

const authentication = (authtoken) =>{
	try {
		const payload = jwt.verify(authtoken, "ECHOSECRET")
		return payload
	} catch (err) {
		console.log(err)
	}
}

export default authentication 
