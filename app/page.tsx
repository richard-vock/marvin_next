"use client";

import { useCallback, useRef, useState } from "react";
import { id, i, init, InstaQLEntity } from "@instantdb/react";
import classNames from "classnames";

// ID for app: marvin
const APP_ID = "37dccdd9-5e5a-454d-8f69-f5ab4ea4685d";

const schema = i.schema({
    entities: {
        memories: i.entity({
            text: i.string(),
            date: i.date(),
            createdAt: i.date(),
            createdBy: i.string(),
        }),
    },
});

type Memory = InstaQLEntity<typeof schema, "memories">;

const db = init({ appId: APP_ID, schema });

function App() {
    const [recording, setRecording] = useState(false);
    const [transcript, setTranscript] = useState('')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const textRef = useRef('')

    const onRecordToggle = useCallback(async () => {
        if (recording) {
            mediaRecorderRef.current?.stop()
            setRecording(false)
        } else {
            if (!navigator.mediaDevices?.getUserMedia) {
                alert('getUserMedia not supported in this browser.')
                return
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const recorder = new MediaRecorder(stream)
                mediaRecorderRef.current = recorder
                audioChunksRef.current = []
                recorder.ondataavailable = (e: BlobEvent) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data)
                }
                recorder.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
                    const apiKey = "";
                    if (!apiKey) {
                        setTranscript('dummy query')
                        return
                    }
                    setTranscript('')
                    textRef.current = ''
                    const form = new FormData()
                    // Supply a filename with extension so server can infer format
                    form.append('file', blob, 'speech.webm')
                    form.append('model', 'whisper-1')
                    form.append('response_format', 'json')
                    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${apiKey}` },
                        body: form,
                    })
                    if (!response.ok) {
                        const error = await response.text()
                        alert('Error: ' + error)
                        return
                    }
                    // Whisper-1 does not support streaming; display the full transcript once available.
                    const data = await response.json()
                    setTranscript(data.text)
                }
                recorder.start()
                setRecording(true)
            } catch (err) {
                console.error(err)
                alert('Error accessing microphone: ' + err)
            }
        }
    }, [recording, setRecording]);

    // Read Data
    const { isLoading, error, data } = db.useQuery({ memories: {} });
    if (isLoading) {
        return;
    }
    if (error) {
        return <div className="text-red-500 p-4">Error: {error.message}</div>;
    }
    const { memories } = data;


    console.log("memories", memories);
    return (
        <div className="font-mono bg-zinc-700 min-h-screen flex justify-center items-center flex-col space-y-32">
            <a href="#" onClick={onRecordToggle}>
                <div className={
                    classNames(
                        "text-gray-200",
                        "text-xs",
                        "rounded-full",
                        "shadow-xl/40",
                        // "hover:from-violet-600",
                        // "hover:to-fuchsia-500",
                        "min-w-50", "min-h-50",
                        "bg-linear-to-t",
                        "flex",
                        "items-center",
                        "justify-center",
                        {
                            "from-violet-600": recording,
                            "to-fuchsia-500": recording,
                            "from-violet-700": !recording,
                            "to-fuchsia-600": !recording,
                        }
                    )
                }>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        className="size-24"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                </div>
            </a>
            <pre className="text-white">Query: {transcript}</pre>
            <CreatedMemoriesList memories={memories} />
        </div >
    );
}

// Write Data
// ---------
function addExampleData() {
    db.transact(
        db.tx.memories[id()].update({
            text: "Appointment with Oliver",
            date: new Date("2025-06-26"),
            createdBy: "Richard",
            createdAt: Date.now(),
        })
    );
}

// function deleteTodo(todo: Todo) {
//     db.transact(db.tx.todos[todo.id].delete());
// }
//
// function toggleDone(todo: Todo) {
//     db.transact(db.tx.todos[todo.id].update({ done: !todo.done }));
// }
//
// function deleteCompleted(todos: Todo[]) {
//     const completed = todos.filter((todo) => todo.done);
//     const txs = completed.map((todo) => db.tx.todos[todo.id].delete());
//     db.transact(txs);
// }
//
// function toggleAll(todos: Todo[]) {
//     const newVal = !todos.every((todo) => todo.done);
//     db.transact(
//         todos.map((todo) => db.tx.todos[todo.id].update({ done: newVal }))
//     );
// }


function CreatedMemoriesList({ memories }: { memories: Memory[] }) {
    return (
        <div className="flex flex-col gap-8 text-gray-200 text-xl">
            {memories.map((todo) => (
                <div key={todo.id} className="flex flex-row items-start h-10 gap-8">
                    <div className="flex-1 overflow-hidden flex items-center">
                        <span>Date: {todo.date}</span>
                    </div>
                    <div className="flex-1 overflow-hidden flex items-center">
                        <span>{todo.text}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default App;
