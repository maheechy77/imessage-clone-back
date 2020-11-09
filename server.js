const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const mongoPosts = require("./imessage.js");
const dontenv = require("dotenv");
const cors = require("cors");

const Pusher = require("pusher");

const app = express();
dontenv.config();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());
const port = process.env.PORT || 9000;

const mongoURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.nrld0.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;

mongoose.connect(mongoURI, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
mongoose.connection.once("open", () => {
	const changeStream = mongoose.connection.collection("conversations").watch();

	changeStream.on("change", (change) => {
		if (change.operationType === "insert") {
			pusher.trigger("chats", "newChat", {
				change: change,
			});
		} else if (change.operationType === "update") {
			pusher.trigger("messages", "newMessage", {
				change: change,
			});
		} else {
			console.log("Error");
		}
	});
});

const pusher = new Pusher({
	appId: "1104469",
	key: "96ec7650382a24ccb4af",
	secret: "83e1b238085a5a70ee2e",
	cluster: "ap2",
	useTLS: true,
});

app.post("/new/channel", (req, res) => {
	const dbPost = req.body;
	console.log(dbPost);
	mongoPosts.create(dbPost, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.get(`/retrive/channel/:chatId`, (req, res) => {
	const channelId = req.params.chatId;
	mongoPosts.find(
		{
			_id: channelId,
		},
		(err, data) => {
			if (err) {
				res.status(500).send(err);
			} else {
				res.status(201).send(data);
			}
		}
	);
});

app.post("/new/message/:chatId", (req, res) => {
	const channelId = req.params.chatId;
	const message = req.body;
	mongoPosts.update(
		{
			_id: channelId,
		},
		{ $push: { conversation: message } },
		(err, data) => {
			if (err) {
				res.status(500).send(err);
			} else {
				res.status(201).send(data);
			}
		}
	);
});

app.get("/get/message", (req, res) => {
	const singleChannelId = req.query.id;
	mongoPosts.find({ _id: singleChannelId }, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.get("/retrive/channelList", (req, res) => {
	let channelList = [];
	mongoPosts.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			data.map((channel) => {
				const channelInfo = {
					channelId: channel._id,
					channelName: channel.channelName,
				};
				channelList.push(channelInfo);
			});

			res.status(201).send(channelList);
		}
	});
});

app.get("/", (req, res) => {
	res.send("Hello world");
});

server.listen(port);
