import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone, FaTrash, FaPlus, FaSearch, FaSort, FaBars,
  FaArchive, FaLightbulb, FaSignOutAlt, FaEdit, FaVolumeUp,
  FaSpellCheck, FaSun, FaMoon, FaThumbtack, FaChevronDown, FaChevronUp
} from "react-icons/fa";
import { HiArchiveBoxArrowDown, HiArchiveBoxXMark } from "react-icons/hi2";
import axios from "axios";
import ImageToText from "../Components/ImageToText";
import { debounce } from "lodash";

const colors = [
  "bg-[#ffe666] text-black", "bg-[#f5c27d] text-black",
  "bg-[#f6cebf] text-black", "bg-[#e3b7d2] text-black", "bg-[#bfe7f6] text-black"
];

function Dashboard() {
  // State declarations
  const [notes, setNotes] = useState([]);
  const [archive, setArchive] = useState([]);
  const [trash, setTrash] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [view, setView] = useState("notes");
  const [recording, setRecording] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState(null);
  const [spokenWordIndices, setSpokenWordIndices] = useState([]);
  const [spellCheckedNotes, setSpellCheckedNotes] = useState({});
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [hasOverflow, setHasOverflow] = useState({});
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true' || false
  );
  const [stickyNote, setStickyNote] = useState(null);
  const [isStickyPinned, setIsStickyPinned] = useState(false);
  const [stickyPosition, setStickyPosition] = useState({
    x: Math.floor(window.innerWidth * 0.3),
    y: 50
  });
  const [stickySize, setStickySize] = useState({
    width: 300,
    height: 300
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });

  // Refs
  const noteInputRef = useRef(null);
  const noteRefs = useRef([]);
  const contentRefs = useRef({});
  const stickyRef = useRef(null);


  // Check for content overflow
  const checkOverflow = useCallback(() => {
    const newHasOverflow = {};
    Object.keys(contentRefs.current).forEach(noteId => {
      if (contentRefs.current[noteId]) {
        const element = contentRefs.current[noteId];
        newHasOverflow[noteId] = element.scrollHeight > element.clientHeight;
      }
    });
    setHasOverflow(newHasOverflow);
  }, []);

  useEffect(() => {
    const getLocalStorageData = (key) => {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error(`Error parsing ${key} from localStorage`, error);
        return [];
      }
    };

    setNotes(getLocalStorageData("notes"));
    setArchive(getLocalStorageData("archive"));
    setTrash(getLocalStorageData("trash"));
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow, notes, archive, trash]);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/notes/all", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setNotes(response.data);
      }
    } catch (error) {
      console.error("Error fetching notes:", error.response?.data || error.message);
    }
  };

  const fetchArchivedNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/notes/archived", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setArchive(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching archived notes:", error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchArchivedNotes();
  }, []);

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
    localStorage.setItem("archive", JSON.stringify(archive));
    localStorage.setItem("trash", JSON.stringify(trash));
  }, [notes, archive, trash]);

  // Spell check function
  const checkSpelling = async (noteId, text) => {
    if (!text) return;

    setIsSpellChecking(true);
    try {
      const response = await axios.post(
        "https://api.languagetool.org/v2/check",
        new URLSearchParams({
          text,
          language: "en-US",
        })
      );

      setSpellCheckedNotes(prev => ({
        ...prev,
        [noteId]: response.data.matches || []
      }));
    } catch (error) {
      console.error("Spell check failed:", error);
    } finally {
      setIsSpellChecking(false);
    }
  };

  // Enhanced speakNote function
  const speakNote = (noteId, content) => {
    if (!content) return;

    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in your browser");
      return;
    }

    if (currentUtterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setCurrentUtterance(null);
      setSpokenWordIndices([]);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    const words = content.match(/[\w']+|[.,!?;]/g) || [];
    setSpokenWordIndices(Array(words.length).fill(false));

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        let wordIndex = 0;
        let count = 0;

        words.some((word, index) => {
          count += word.length + (index < words.length - 1 ? 1 : 0);
          if (charIndex < count) {
            wordIndex = index;
            return true;
          }
          return false;
        });

        setSpokenWordIndices(prev => {
          const newIndices = [...prev];
          newIndices[wordIndex] = true;
          return newIndices;
        });

        if (noteRefs.current[noteId]) {
          const activeElement = noteRefs.current[noteId].querySelector(`.word-${wordIndex}`);
          if (activeElement) {
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }
      }
    };

    utterance.onend = () => {
      setCurrentUtterance(null);
      setSpokenWordIndices([]);
    };

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle note expansion
  const toggleExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  // Render text with spelling errors highlighted
  const renderTextWithSpelling = (noteId, text) => {
    if (!text) return null;

    const errors = spellCheckedNotes[noteId] || [];
    const words = text.match(/[\w']+|[.,!?;]/g) || [];

    return words.map((word, index) => {
      const isError = errors.some(err =>
        err.offset <= text.indexOf(word) &&
        (err.offset + err.length) >= text.indexOf(word) + word.length
      );
      const isSpoken = spokenWordIndices[index];

      return (
        <span
          key={index}
          className={`
            ${isError ? 'text-red-500 underline decoration-wavy' : ''}
            ${isSpoken ? 'bg-yellow-200 px-1 rounded transition-all duration-200' : ''}
            word-${index}
          `}
        >
          {word}{' '}
        </span>
      );
    });
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const addNote = async () => {
    const title = (newTitle || '').trim();
    const content = (newNote || '').trim();

    if (title === "" || content === "") return;

    try {
      const token = localStorage.getItem("token");
      const color = colors[Math.floor(Math.random() * colors.length)];

      const response = await axios.post(
        "http://localhost:5000/api/notes",
        { title, content, color },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setNotes(prevNotes => [
          ...prevNotes,
          {
            _id: response.data.note.id,
            title: response.data.note.title,
            content: response.data.note.content,
            createdAt: new Date().toISOString(),
            color: response.data.note.color || color,  // Use the color from response or fallback
          },
        ]);
        setNewTitle("");
        setNewNote("");
      }
    } catch (error) {
      console.error("Error adding note:", error.response?.data || error.message);
    }
  };

  const deleteNote = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`http://localhost:5000/api/notes/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });

      setNotes(prevNotes => prevNotes.filter(note => note._id !== id));
    } catch (error) {
      console.error("Error deleting note:", error.response?.data || error.message);
    }
  };

  const archiveNote = async (id) => {
    try {
      setIsArchiving(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/notes/${id}/archive`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setNotes(prevNotes => prevNotes.filter(note => note._id !== id));
        setArchive(prevArchive => [...prevArchive, response.data.data]);
      }
    } catch (error) {
      console.error("Error archiving note:", error.response?.data || error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const unarchiveNote = async (id) => {
    try {
      setIsArchiving(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/notes/${id}/unarchive`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setArchive(prevArchive => prevArchive.filter(note => note._id !== id));
        setNotes(prevNotes => [...prevNotes, response.data.data]);
      }
    } catch (error) {
      console.error("Error unarchiving note:", error.response?.data || error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const startEditing = (note) => {
    if (!note || !note._id) {
      console.error("Invalid note object:", note);
      return;
    }

    setEditingNote(note._id);
    setEditedContent(note.content || '');
    setEditedTitle(note.title || '');
  };

  const saveEditedNote = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `http://localhost:5000/api/notes/${id}`,
        { content: editedContent, title: editedTitle },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        setNotes(prevNotes => prevNotes.map(note =>
          note._id === id ? response.data.note : note
        ));
        setEditingNote(null);
        setEditedContent("");
        setEditedTitle("");
      }
    } catch (error) {
      console.error("Error updating note:", error.response?.data || error.message);
    }
  };

  const startRecording = () => {
    setRecording(true);
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (event) => {
      setNewNote(event.results[0][0].transcript);
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
  };

  const performSearch = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setFilteredNotes(notes);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/notes/search`, {
        params: { query },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setFilteredNotes(response.data.data);
      } else {
        console.error("Search failed:", response.data.message);
        // Fallback to local search if API fails
        const localResults = notes.filter(note =>
          (note.title && note.title.toLowerCase().includes(query.toLowerCase())) ||
          (note.content && note.content.toLowerCase().includes(query.toLowerCase()))
        );
        setFilteredNotes(localResults);
      }
    } catch (error) {
      console.error("Search error:", error.response?.data || error.message);
      // Fallback to local search on error
      const localResults = notes.filter(note =>
        (note.title && note.title.toLowerCase().includes(query.toLowerCase())) ||
        (note.content && note.content.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredNotes(localResults);
    }
  }, [notes]);

  const debouncedSearch = useRef(
    debounce((query) => performSearch(query), 500)
  ).current;

  useEffect(() => {
    if (!search.trim()) {
      setFilteredNotes(notes);
      return;
    }
    debouncedSearch(search);
  }, [search, notes, debouncedSearch]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    let updatedNotes = [...filteredNotes];
    updatedNotes.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return (a.content || '').localeCompare(b.content || '');
    });
    setFilteredNotes(updatedNotes);
  }, [sortBy, filteredNotes]);

  const displayedNotes = view === "notes" ?
    (search ? filteredNotes : notes.filter(note => !note.archived)) :
    view === "archive" ?
      archive :
      trash;

  // Make note sticky
  const StickyNoteOverlay = () => {
    // All hooks must come first
    const handleMouseMove = useCallback((e) => {
      if (isDragging) {
        setStickyPosition({
          x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - stickySize.width)),
          y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - stickySize.height))
        });
      }
  
      if (isResizing) {
        setStickySize({
          width: Math.max(200, startSize.width + (e.clientX - stickyPosition.x - startSize.width)),
          height: Math.max(150, startSize.height + (e.clientY - stickyPosition.y - startSize.height))
        });
      }
    }, [isDragging, isResizing, dragOffset, stickySize, startSize, stickyPosition]);
  
    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      setIsResizing(false);
    }, []);
  
    useEffect(() => {
      if (isDragging || isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);
  
    // Early return comes after all hooks
    if (!stickyNote || !isStickyPinned) return null;
  
    // Define color variables - THIS IS THE CRITICAL FIX
    const colorClass = stickyNote?.colors || colors[0]; // Use colors[0] as fallback
    const textColor = darkMode ? 'text-white' : 'text-black';
  
    const handleMouseDown = (e) => {
      if (e.target.classList.contains('resize-handle')) {
        setIsResizing(true);
        setStartSize({ width: stickySize.width, height: stickySize.height });
        return;
      }
  
      if (!e.target.classList.contains('close-button')) {
        setIsDragging(true);
        setDragOffset({
          x: e.clientX - stickyPosition.x,
          y: e.clientY - stickyPosition.y
        });
      }
    };
  
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          ref={stickyRef}
          className={`absolute rounded-xl shadow-xl p-4 flex flex-col pointer-events-auto ${colorClass} ${textColor}`}
          style={{
            left: `${stickyPosition.x}px`,
            top: `${stickyPosition.y}px`,
            width: `${stickySize.width}px`,
            height: `${stickySize.height}px`,
            minWidth: '200px',
            minHeight: '150px',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold truncate">{stickyNote.title}</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                setIsStickyPinned(false);
                setStickyNote(null);
              }}
              className="close-button p-1 rounded-full hover:bg-opacity-20 hover:bg-black"
              aria-label="Close sticky note"
            >
              ✕
            </button>
          </div>
  
          <div className="flex-1 overflow-y-auto mb-2">
            {stickyNote.content}
          </div>
  
          <div
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 opacity-50 hover:opacity-100"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
              setStartSize({ width: stickySize.width, height: stickySize.height });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-300 text-black'}`}>
      {/* Sidebar */}
      {sidebarVisible && (
        <aside className={`w-64 ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} p-4 shadow-md h-full flex flex-col fixed sm:static z-10`}>
          <nav className="space-y-6 pt-5 text-lg flex-grow">
            <a
              className={`flex items-center space-x-4 cursor-pointer ${darkMode ? 'hover:text-white' : 'hover:text-[#222222]'}`}
              onClick={() => {
                setView("notes");
                if (window.innerWidth < 640) setSidebarVisible(false);
              }}
            >
              <FaLightbulb className={`text-xl hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-[#222222]'}`} />
              <span>Notes</span>
            </a>
            <a
              className={`flex items-center space-x-4 cursor-pointer ${darkMode ? 'hover:text-white' : 'hover:text-[#222222]'}`}
              onClick={() => {
                setView("archive");
                if (window.innerWidth < 640) setSidebarVisible(false);
              }}
            >
              <FaArchive className={`text-xl hover:scale-110 transition-transform ${darkMode ? 'text-white' : 'text-[#222222]'}`} />
              <span>Archive</span>
            </a>
          </nav>
          <div className="mt-auto pb-10 overflow-auto">
            <ImageToText darkMode={darkMode} />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="mt-4 flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? (
                <>
                  <FaSun className="text-yellow-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <FaMoon className="text-gray-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:ml-0">
        <header className={`flex flex-wrap sm:flex-nowrap items-center justify-between ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} p-3 shadow-md px-4 sm:px-6 w-full`}>
          <div className="flex items-center space-x-4 mb-2 sm:mb-0">
            <FaBars
              className={`${darkMode ? 'text-white' : 'text-[#222222]'} cursor-pointer text-xl hover:scale-110 transition-transform`}
              onClick={() => setSidebarVisible(!sidebarVisible)}
            />
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#222222]'}`}>Notify</h1>
          </div>

          <div className="flex items-center flex-1 sm:flex-initial space-x-2 sm:space-x-4 justify-center sm:justify-end">
            <div className="relative w-full max-w-[180px] sm:max-w-xs md:max-w-sm">
              <input
                type="text"
                placeholder="Search"
                className={`w-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'} rounded-full py-2 px-4 pl-10 text-sm focus:outline-none`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FaSearch className={`absolute top-2.5 left-3 ${darkMode ? 'text-white' : 'text-[#222222]'} text-sm`} />
            </div>

            <FaSort
              className={`${darkMode ? 'text-white' : 'text-[#222222]'} text-xl hover:scale-110 transition-transform`}
              onClick={() => setSortBy(sortBy === "date" ? "content" : "date")}
            />

            <button
              onClick={logout}
              className={`flex items-center space-x-2 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'} transition-colors text-lg`}
            >
              <FaSignOutAlt className="text-xl" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} p-3 rounded-lg shadow-md mb-6 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4`}>
            <input
              type="text"
              placeholder="Title..."
              className={`${darkMode ? 'bg-gray-700 text-white placeholder-gray-200' : 'bg-transparent text-black'} font-bold text-lg sm:text-2xl focus:outline-none flex-1 sm:max-w-[20%] w-full`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") noteInputRef.current.focus();
              }}
            />
            <input
              type="text"
              placeholder="Take a note..."
              className={`${darkMode ? 'bg-gray-700 text-white placeholder-gray-200' : 'bg-transparent text-black'} text-xl font-semibold focus:outline-none flex-1 w-full`}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addNote()}
              ref={noteInputRef}
            />
            <FaMicrophone
              className={`cursor-pointer text-xl hover:scale-110 transition-transform ${recording ? "text-red-600" : darkMode ? "text-white" : "text-[#222222]"}`}
              onClick={startRecording}
            />
            <button onClick={addNote}>
              <FaPlus className={`${darkMode ? 'text-white' : 'text-[#222222]'} text-xl hover:scale-110 transition-transform`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedNotes.length > 0 ? (
              displayedNotes.map((note) => (
                <div
                  key={note._id}
                  ref={(el) => (noteRefs.current[note._id] = el)}
                  className="p-4 rounded-xl shadow-md text-lg"
                  style={{
                    backgroundColor: note.color || (darkMode ? "#374151" : "#ffffff"),
                    color: darkMode ? "black" : "#000000",
                  }}
                >
                  {editingNote === note._id ? (
                    <>
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-gray-600 text-[#222222]' : 'bg-gray-200'} p-1 font-bold text-2xl rounded mb-2`}
                      />
                      <input
                        type="text"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-gray-600 text-[#222222]' : 'bg-gray-200'} p-1 rounded`}
                      />
                    </>
                  ) : (
                    <>
                      <h3 className={`text-2xl font-serif font-bold ${darkMode ? 'text-[#222222]' : 'text-black'}`}>{note.title}</h3>
                      <div
                        ref={(el) => (contentRefs.current[note._id] = el)}
                        className={`break-words font-mono ${expandedNotes[note._id] ? '' : 'max-h-24 overflow-hidden'}`}
                      >
                        {note.content ? renderTextWithSpelling(note._id, note.content) : null}
                      </div>
                      {hasOverflow[note._id] && (
                        <button
                          onClick={() => toggleExpand(note._id)}
                          className={`${darkMode ? 'text-blue-900' : 'text-blue-900'} text-sm mt-2 flex items-center`}
                        >
                          {expandedNotes[note._id] ? (
                            <>
                              <FaChevronUp className="mr-1" /> Show Less
                            </>
                          ) : (
                            <>
                              <FaChevronDown className="mr-1" /> Show More
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                  <div className="flex items-center mt-2 space-x-3 flex-wrap">
                    {editingNote === note._id ? (
                      <button
                        onClick={() => saveEditedNote(note._id)}
                        className="text-green-600 text-xl"
                      >
                        ✅
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(note)}
                        className={`${darkMode ? 'text-[#222222]' : 'text-gray-800'} text-2xl`}
                      >
                        <FaEdit />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNote(note._id)}
                      className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-xl`}
                    >
                      <FaTrash />
                    </button>
                    <button
                      onClick={() => speakNote(note._id, `${note.title}. ${note.content}`)}
                      className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-xl hover:scale-110 transition-transform ${currentUtterance && window.speechSynthesis.speaking
                        ? "text-red-500 animate-pulse"
                        : ""
                        }`}
                      title={
                        currentUtterance && window.speechSynthesis.speaking
                          ? "Stop speaking"
                          : "Speak note"
                      }
                    >
                      <FaVolumeUp />
                    </button>
                    <button
                      onClick={() => checkSpelling(note._id, note.content)}
                      disabled={isSpellChecking}
                      className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-xl hover:scale-110 transition-transform`}
                      title="Check spelling"
                    >
                      <FaSpellCheck />
                      {isSpellChecking && (
                        <span className="ml-1 text-xs">...</span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setStickyNote({
                          ...note,
                          color: note.colors || colors[Math.floor(Math.random() * colors.length)]
                        });
                        setIsStickyPinned(true);
                      }}
                      className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-xl hover:scale-110 transition-transform`}
                      title="Make sticky"
                    >
                      <FaThumbtack />
                    </button>
                    {view === "archive" ? (
                      <button
                        onClick={() => unarchiveNote(note._id)}
                        disabled={isArchiving}
                        className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-2xl p-2 ${isArchiving ? "opacity-50" : ""
                          }`}
                        title="Unarchive"
                      >
                        <HiArchiveBoxXMark />
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveNote(note._id)}
                        disabled={isArchiving}
                        className={`${darkMode ? 'text-[#222222]' : 'text-[#222222]'} text-2xl p-2 ${isArchiving ? "opacity-50" : ""
                          }`}
                        title="Archive"
                      >
                        <HiArchiveBoxArrowDown />
                      </button>
                    )}
                  </div>
                  <small className={`block mt-2 ${darkMode ? 'text-[#222222]' : 'text-gray-700'}`}>
                    {new Date(note.createdAt).toLocaleString()}
                  </small>
                </div>
              ))
            ) : (
              <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'} col-span-3`}>
                {view === "archive"
                  ? "No archived notes available"
                  : "No notes available"}
              </p>
            )}
          </div>
        </main>
      </div>
      <StickyNoteOverlay />
    </div>
  );
}

export default Dashboard;