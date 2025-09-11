import { Question } from "@/types/game";

export const gameQuestions: Question[] = [
  {
    id: 1,
    text: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 2,
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 3,
    text: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 4,
    text: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctAnswer: 3,
    timeLimit: 30,
  },
  {
    id: 5,
    text: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 6,
    text: "What is the chemical symbol for gold?",
    options: ["Go", "Au", "Gd", "Ag"],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 7,
    text: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 8,
    text: "What is the tallest mountain in the world?",
    options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 9,
    text: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 10,
    text: "What is the speed of light?",
    options: ["299,792 km/s", "199,792 km/s", "399,792 km/s", "499,792 km/s"],
    correctAnswer: 0,
    timeLimit: 30,
  },
];