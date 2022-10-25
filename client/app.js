const token = localStorage.getItem("token")
if (!token) {
	window.location.href = "/login.html"
}
let yourName = ''
let localdb = []
let chatAvatar = {}

const sendForm= document.getElementById('sendForm')
const sendInput = document.getElementById('sendInput')
const msgContainer = document.querySelector('.msgContainer')
const bannerText= document.querySelector('#bannerText')
const bannerAvatar= document.querySelector('#bannerAvatar')


/*Fuction for displaying events inside chat container --redundant*/
function appendEvent(data) {
	let info = document.createElement('p')
	info.setAttribute('id', 'infoEvent')
	info.textContent= data
	msgContainer.appendChild(info)
	msgContainer.scrollTo(0, msgContainer.scrollHeight)
}

/*Provide timestamps*/
function timeStamp (date) {
	if (date === undefined) {
		return (new Date(Date.now()))
			.toLocaleString('en-US',
			{hour: 'numeric', minute: 'numeric', hour12: 'true'})
	} 
	let day = (Date.now() - date) / 86400000 // 1 day in millisec

	if (day < 1) {
		return ( 
			(new Date(date))
			.toLocaleString('en-US',
					{hour: 'numeric', minute: 'numeric', hour12: 'true'}))
	}
	else {
		return (`${Math.floor(day)}d`) 
	}
}

/*Append old messages from database*/
function getMessages(data) {
	msgContainer.innerHTML += data.map((m) => {
		if (m.name === yourName) {
			return (
			`<div class="bubble" id="youMsg">
					<div class="impWrapper">
						<img src="${chatAvatar[m.name]}" class="chatAvatar" style="margin-right:0.3rem">
					</div>
					<div id="youBubble">${m.msg}</div>
					<small>You ${timeStamp(m.time)}</small>
				</div>`)}
		return (
		`<div class="bubble" id="otherMsg">
				<div id="otherBubble">${m.msg}</div>
				<div class="impWrapper">
					<img src="${chatAvatar[m.name]}" class="chatAvatar" style="margin-left:0.3rem">
				</div>
				<small id="smallOther">${m.name} ${timeStamp(m.time)}</small>
			</div>`)
	}).join('')
}

/*~~~~~~~~~= SOCKET IO START =~~~~~~~~~*/
const socket = io('/',{
	auth : {
		token : token 
	}
}) 


/*Welcome , gets called after dashboard -2*/
socket.on('welcome', data => {
	yourName = data
	bannerText.innerHTML = yourName
	const mapLocal= localdb.map(m =>({[m.name]: m.profile}))  
	chatAvatar = Object.assign({}, ...mapLocal) // putting here casue user only need to do once 
	bannerAvatar.src = chatAvatar[yourName]
})


/*Load previous chats -3*/
socket.on('prev_messages', data => {
	console.log(data)
	getMessages(data)
	appendEvent(`You entered the chat ${timeStamp()}`)
	scrollToBottom()
}) 

function scrollToBottom () {
	msgContainer.scrollTo(0, msgContainer.scrollHeight)
}

/*Notify if someone enters*/
socket.on('someone-entered', data => {
	appendEvent(`${data} entered the chat ${timeStamp()}`)
})


/*Send Messages*/
sendForm.addEventListener('submit',(e) =>{
	e.preventDefault()
	if(sendInput.value) {
		socket.emit('user-message',sendInput.value)

		let item = document.createElement('div')
		item.textContent = sendInput.value
		sendInput.value = ''
		item.setAttribute('id', 'youBubble')

		let nameStamp = document.createElement('small')
		nameStamp.textContent = `You ${timeStamp()}`

		let bubble = document.createElement('div')
		bubble.classList.add('bubble')
		bubble.setAttribute('id', 'youMsg')
		bubble.appendChild(item)
		bubble.appendChild(nameStamp)

		msgContainer.appendChild(bubble)
		scrollToBottom()
	}
})

//Getting Broadcasted message
socket.on('other-message', data =>{
	console.log('received message: ' + data) // testing

	let item = document.createElement('div')
	item.textContent = data.msg
	item.setAttribute('id', 'otherBubble')

	let nameStamp = document.createElement('small')
	nameStamp.setAttribute('id', 'smallOther')
	nameStamp.textContent = `${data.name} ${timeStamp()}`

	let bubble = document.createElement('div')
	bubble.classList.add('bubble')
	bubble.setAttribute('id', 'otherMsg')
	bubble.appendChild(item)
	bubble.appendChild(nameStamp)

	msgContainer.appendChild(bubble)

	msgContainer.scrollTo(0, msgContainer.scrollHeight)
})

//Disconnected user 
socket.on('user-disconnect',data => {
	appendEvent(`${data} left the chat ${timeStamp()}`)
})

socket.on('connect_error', (err)=>{
	appendEvent(err.message)
})

/*~~~~~~~~~= DASHBOARD =~~~~~~~~~*/

const members = document.querySelector('.members')

socket.on('dashboard-details', data => {
	console.log(data)
	localdb = data
	members.innerHTML= data.map((m) => (`
	<div class="member">
		<img src="${m.profile}" alt="profilepic" class="profilepic">
		<div class="wrapper">
			<div class="memberName">${m.name}</div>
			<div class="status" style="color:tomato">
			${isNaN(m.last_seen) ? m.last_seen : `last seen ${timeStamp(m.last_seen)}`}</div>
		</div>
	</div>
	`)).join('')
})



