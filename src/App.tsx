import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import Millis from "@millisai/web-sdk";

enum State {
    IDLE,
    CONNECTING,
    READY
}

enum userInputEnum {
    MICROPHONE,
    TEXT,
}

interface Message {
    user: "bot" | "user";
    content: string;
    time: number;
    formRequest?: FormRequest;
}

export interface FormRequest {
    name: string,
    param: string;
    description: string;
}

const client = Millis.createClient({
    publicKey: "qAflhakXVgm0uSHpNfkdJi0Ck52hoHsp",
});

export default function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState("");
    const [callState, setCallState] = useState<State>(State.IDLE);
    const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
    const [userInputStatus, setUserInputStatus] = useState<userInputEnum>(userInputEnum.TEXT);
    const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);
    const [isBotSpeaking, setIsBotSpeaking] = useState(false);

    const [emailResponses, setEmailResponses] = useState<{ [key: number]: string }>({});
    const [emailInput, setEmailInput] = useState("");

    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMessages([
            { user: "bot", content: "Send or say something...", time: 16653678 },
        ]);
    }, []);

    useEffect(() => {
        client.on("onready", () => {
            setCallState(State.READY);
        });

        client.on("onresponsetext", (text: string, payload: { is_final?: boolean }) => {
            if (!isBotSpeaking) {
                setIsBotSpeaking(true);
                setActiveMessageIndex(messages.length);
            }

            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.user === "bot") {
                    return [
                        ...prevMessages.slice(0, -1),
                        { ...lastMessage, content: text },
                    ];
                } else {
                    const newMessage: Message = { user: "bot", content: text, time: Date.now() };
                    return [...prevMessages, newMessage];
                }
            });

            if (payload.is_final) {
                setIsBotSpeaking(false);
                setActiveMessageIndex(null);
            }
        });

        client.on("ontranscript", (data: string) => {
            if (data.trim() === "") return;

            if (isBotSpeaking) {
                setIsBotSpeaking(false);
                setMessages((prevMessages) => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage && lastMessage.user === "bot") {
                        return prevMessages.slice(0, -1);
                    }
                    return prevMessages;
                });
            }

            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.user === "user") {
                    return [
                        ...prevMessages.slice(0, -1),
                        { ...lastMessage, content: data },
                    ];
                } else {
                    const newMessage: Message = { user: "user", content: data, time: Date.now() };
                    setActiveMessageIndex(prevMessages.length);
                    return [...prevMessages, newMessage];
                }
            });
        });

        client.on("analyzer", (analyzer: AnalyserNode) => {
            setAnalyzer(analyzer);
        });

        client.on("onclose", ({ code, reason }) => {
            setCallState(State.IDLE);
            setAnalyzer(null);
            setActiveMessageIndex(null);
            setIsBotSpeaking(false);
        });

        client.on("onerror", (error) => {
            setCallState(State.IDLE);
            setAnalyzer(null);
            setActiveMessageIndex(null);
            setIsBotSpeaking(false);
        });

        client.on("open_web_form", (data: FormRequest) => {
            console.log(data);
            setMessages((prevMessages) => {
                const existingMessageIndex = prevMessages.findIndex(
                    (msg) => msg.formRequest && msg.formRequest.param === data.param
                );

                if (existingMessageIndex !== -1) {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[existingMessageIndex] = {
                        ...updatedMessages[existingMessageIndex],
                        content: data.description,
                        formRequest: data,
                    };
                    return updatedMessages;
                } else {
                    return [
                        ...prevMessages,
                        { user: "bot", content: data.description, time: Date.now(), formRequest: data },
                    ];
                }
            });
        });

        client.on("onfunction", (text: string, data: {name: string, params: object, result?: string}) => {
            console.log(text, data);
        });

    }, [isBotSpeaking, messages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function handleSendClick() {
        if (userInput !== "") {
            setMessages((prevMessages) => [
                ...prevMessages,
                { user: "user", content: userInput, time: Date.now() },
            ]);
            setUserInput("");
        } else {
            setUserInputStatus(userInputEnum.MICROPHONE);
        }
    }

    function handleEnterKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && userInput !== "") {
            e.preventDefault();
            handleSendClick();
        }
    }

    async function toggleConversation() {
        if (callState === State.READY) {
            await client.stop();
            setCallState(State.IDLE);
        } else if (callState === State.IDLE) {
            setCallState(State.CONNECTING);
            try {
                await client.start({
                    agent: {
                        agent_id: "-OJIKLFr--81FObur94o",
                        agent_config: {
                            prompt: "",
                            voice: { provider: "elevenlabs", voice_id: "Rachel" },
                            first_message: "Hi, I am Rosa your recipe and wine expert. Would you like some dish or wine recommendation?",
                        },
                    },
                    messages: {
                        name: "John Doe",
                    },
                });
                setCallState(State.READY);
            } catch (err) {
                console.error(err);
                setCallState(State.IDLE);
            }
        }
    }

    function btnContent() {
        switch (callState) {
        case State.READY: return "STOP";
        case State.CONNECTING: return "CONNECTING";
        default: return <img src="/buttons/recording-button.svg" alt="" />;
        }
    }

    async function handleCloseButton() {
        setUserInputStatus(userInputEnum.TEXT);
        await client.stop();
        setCallState(State.IDLE);
    }

    function newMessage(user: "bot" | "user", content: string) {
        setMessages((prevMessages) => [
            ...prevMessages,
            {user, content, time: Date.now() },
        ])
    }

    const handleFormSubmission = (res: string | null, formRequest: FormRequest) => {
        console.log(formRequest);
        console.log(res)
        if (res && formRequest) {
            client.send(JSON.stringify({"method": "web_form_response", "data": {[formRequest.param]: res}}));
            newMessage("user", "Email sent!")
        } else if (!res && formRequest){
            client.send(JSON.stringify({"method": "web_form_response", "data": {[formRequest.param]: null, "reason": "User didn't want to share the info"}}));
            newMessage("user", "Email didn't sent!")
        }
        setEmailInput("");
    }

    return (
        <div className={"chat-widget"}>
            <div className={"header"}>
                <div className={"header-container"}>
                    <img src="/intercom-logo.svg" alt="" className={"header-icon"} />
                    <div className={"header-description"}>
                        <div className={"header-title"}>Hugo</div>
                        <div className={"header-description-container"}>
                            <div className={"header-description-ai-icon"}>AI</div>
                            <div className={"header-description-bot-text"}>Bot</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`chat-container ${userInputStatus === userInputEnum.MICROPHONE && "microphone"}`}>
                {messages.length === 0 && <div style={{color: "black"}}>Send or say something...</div>}
                {messages.map((message, index) => (
                    <div className={`message ${message.user}`} key={`message-${index}`}>
                        <div className={`message-container ${message.user}`}>
                            {message.user === "bot" && <img className={"icon"} src="/intercorn-logo-grey.png" alt={""} />}
                            <div className={`message-content ${message.user}`}>
                                {message.content}
                                {activeMessageIndex === index && (
                                    <span className="typing-indicator">...</span>
                                )}
                                {message.formRequest && message.formRequest.description.includes("Please provide your email address") && (
                                    <div className="email-form">
                                        <input
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            placeholder="Enter your email"
                                            className="email-input"
                                        />
                                        <button
                                            onClick={() => handleFormSubmission(emailInput, message.formRequest!)}
                                            className="email-submit-button"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>
            {userInputStatus === userInputEnum.TEXT ? (
                <div className={"footer"}>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className={"footer-input"}
                        placeholder={"Type your problems here"}
                        onKeyDown={(e) => handleEnterKeyDown(e)}
                    />
                    <button className={"footer-send-button"} onClick={handleSendClick}>
                        <img
                            src={userInput !== '' ? "/buttons/send-button.svg" : "/buttons/microphone-button.svg"}
                            alt=""
                        />
                    </button>
                </div>
            ) : (
                <div className={"footer-microphone"}>
                    <button className={"footer-microphone-button"}>
                        <img src="/buttons/more-button.svg" alt="" />
                    </button>
                    <button className={"footer-microphone-button main"} onClick={toggleConversation}>
                        {btnContent()}
                    </button>
                    <button className={"footer-microphone-button"} onClick={handleCloseButton}>
                        <img src="/buttons/cancel-button.svg" alt="" />
                    </button>
                </div>
            )}
        </div>
    );
}