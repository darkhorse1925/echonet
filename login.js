import jwt from 'jsonwebtoken'
import customError from './customError.js'
import {readFile} from 'fs/promises'
import {URL} from 'url'

const __dirname = new URL('.', import.meta.url).pathname
let members = []

const login = async (req,res) => {

	try {
		const db = await readFile(__dirname + '/db.json', 'utf8')
		members = JSON.parse(db)
		console.log(members)
	} catch (err) {
		console.log(err)
		throw new customError("cannot read db", 500)
	}

	console.log(members) // testing
	console.log(req.body)

	const {username , password: providedPassword} = req.body

	if(!username || !providedPassword) {
		throw new customError("Please provide valid credentials", 400)
	}

/*Find user*/
	const candidate = members.find((m) => m.name === username )
	console.log(candidate)

	if(!candidate){
		throw new customError("User Not Found", 401)
	}

/*Verify Password and send token*/
	if (providedPassword === candidate.password) {
		console.log("worked")
		const token = jwt.sign({username}, "ECHOSECRET", {expiresIn: '30d'})
		console.log(token)
		return res.status(200).json({token})
	} 
	else {
		throw new customError("Not Authorized !",401)
}
}

export default login 
