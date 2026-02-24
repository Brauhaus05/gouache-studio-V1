import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Wand2, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT_TEMPLATE = `Painterly gouache illustration of [SUBJECT], heavy dry-brush texture, visible bristle strokes, grainy paper surface, layered opaque paint, imperfect hand-drawn ink outlines, limited color palette (#E3CEBF, #FB5E3C. #6F94B7, #FF9B45, #0E2020), soft stylized lighting, flat graphic shadows, speckled paint splatter, distressed poster edges, mid-century modern editorial art style, high detail texture, matte finish. Use a 2:3 aspect ratio`;

export default function App() {
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const prompt = PROMPT_TEMPLATE.replace('[SUBJECT]', subject.trim());
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
          }
        }
      });
      
      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          setGeneratedImage(imageUrl);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        throw new Error("No image was returned by the model.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim() || !generatedImage) return;
    
    setIsEditing(true);
    setError(null);
    
    try {
      const match = generatedImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format.");
      
      const mimeType = match[1];
      const base64Data = match[2];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: editPrompt.trim(),
            },
          ],
        },
      });
      
      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          setGeneratedImage(imageUrl);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) {
        throw new Error("No image was returned by the model.");
      }
      setEditPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `gouache-${subject.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'illustration'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-8 md:p-12 flex flex-col border-b md:border-b-0 md:border-r border-gouache-ink/10 bg-gouache-paper/30">
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-bold tracking-tight mb-3 text-gouache-ink">
            Gouache<br/>Studio
          </h1>
          <p className="text-gouache-ink/70 text-sm leading-relaxed">
            Generate mid-century modern editorial illustrations with heavy dry-brush texture and a limited palette.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-8">
          {/* Generate Form */}
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div>
              <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-gouache-ink/60 mb-2">
                Subject
              </label>
              <textarea
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. A black cat sitting on a yellow mid-century chair"
                className="w-full bg-white/50 border border-gouache-ink/20 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gouache-red/50 focus:border-gouache-red transition-all resize-none h-32"
                disabled={isGenerating || isEditing}
              />
            </div>
            <button
              type="submit"
              disabled={!subject.trim() || isGenerating || isEditing}
              className="bg-gouache-red hover:bg-gouache-red/90 disabled:bg-gouache-red/50 text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Painting...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Illustration
                </>
              )}
            </button>
          </form>

          {/* Edit Form (Only visible if image exists) */}
          <AnimatePresence>
            {generatedImage && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleEdit}
                className="flex flex-col gap-4 pt-8 border-t border-gouache-ink/10 overflow-hidden"
              >
                <div>
                  <label htmlFor="editPrompt" className="block text-xs font-bold uppercase tracking-wider text-gouache-ink/60 mb-2">
                    Refine Image
                  </label>
                  <input
                    id="editPrompt"
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g. Add a retro filter, make it night time..."
                    className="w-full bg-white/50 border border-gouache-ink/20 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gouache-blue/50 focus:border-gouache-blue transition-all"
                    disabled={isGenerating || isEditing}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!editPrompt.trim() || isGenerating || isEditing}
                  className="bg-gouache-blue hover:bg-gouache-blue/90 disabled:bg-gouache-blue/50 text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Apply Edit
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Image Display */}
      <div className="flex-1 p-8 md:p-12 flex items-center justify-center bg-gouache-bg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-gouache-red blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-gouache-blue blur-3xl"></div>
        </div>

        <div className="w-full max-w-2xl aspect-[2/3] relative z-10 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {generatedImage ? (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full relative group rounded-2xl shadow-2xl overflow-hidden bg-white"
              >
                <img
                  src={generatedImage}
                  alt="Generated gouache illustration"
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay controls */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button
                    onClick={handleDownload}
                    className="bg-white text-gouache-ink rounded-full p-4 hover:scale-110 transition-transform shadow-lg flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Loading overlay for editing */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
                    >
                      <Loader2 className="w-10 h-10 animate-spin text-gouache-blue mb-4" />
                      <p className="font-serif text-gouache-ink text-lg italic">Applying edits...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full border-2 border-dashed border-gouache-ink/20 rounded-2xl flex flex-col items-center justify-center text-gouache-ink/40 bg-white/20 backdrop-blur-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-gouache-red" />
                    <p className="font-serif text-lg italic text-gouache-ink/60">Preparing canvas...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-serif text-lg italic">Your masterpiece will appear here</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
