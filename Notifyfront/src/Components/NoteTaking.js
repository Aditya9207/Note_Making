
// NoteTaking.js
import { useState } from "react";

function NoteTaking() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");

  const addNote = () => {
    setNotes([...notes, note]);
    setNote("");
  };

  return (
    <div className="mt-6">
      <input type="text" placeholder="Add a note..." className="border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500" value={note} onChange={(e) => setNote(e.target.value)} />
      <button onClick={addNote} className="bg-blue-500 text-white p-3 rounded-lg mt-3 hover:bg-blue-700 transition">Add Note</button>
      <ul className="mt-4">
        {notes.map((n, index) => (
          <li key={index} className="border p-3 mt-2 rounded-lg shadow-sm bg-gray-50">{n}</li>
        ))}
      </ul>
    </div>
  );
}

export default NoteTaking;






