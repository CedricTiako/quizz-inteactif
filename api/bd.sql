-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : ven. 20 déc. 2024 à 14:21
-- Version du serveur : 10.5.22-MariaDB
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
/*!40101 SET NAMES utf8mb4 */

--
-- Base de données : `ayoba-yamo-quizz`
--

-- --------------------------------------------------------

--
-- Structure de la table `answers`
--

CREATE TABLE `answers` (
  `answer_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_text` varchar(255) NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT 0,
  `answer_order` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `answers`
--

INSERT INTO `answers` (`answer_id`, `question_id`, `answer_text`, `is_correct`, `answer_order`) VALUES
(1, 1, 'Paris', 1, 1),
(2, 1, 'London', 0, 2),
(3, 1, 'Berlin', 0, 3),
(4, 1, 'Madrid', 0, 4),
(5, 2, 'Mars', 1, 1),
(6, 2, 'Venus', 0, 2),
(7, 2, 'Jupiter', 0, 3),
(8, 2, 'Saturn', 0, 4),
(9, 3, 'Leonardo da Vinci', 1, 1),
(10, 3, 'Pablo Picasso', 0, 2),
(11, 3, 'Vincent van Gogh', 0, 3),
(12, 3, 'Michelangelo', 0, 4),
(13, 4, 'Au', 1, 1),
(14, 4, 'Ag', 0, 2),
(15, 4, 'Fe', 0, 3),
(16, 4, 'Cu', 0, 4);

-- --------------------------------------------------------

--
-- Structure de la table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `categories`
--

INSERT INTO `categories` (`category_id`, `name`, `description`, `created_at`) VALUES
(1, 'General Knowledge', 'Test your knowledge across various topics', '2024-12-19 17:47:53'),
(2, 'Science', 'Explore the wonders of science', '2024-12-19 17:47:53'),
(3, 'History', 'Journey through time with historical facts', '2024-12-19 17:47:53'),
(4, 'Technology', 'Stay up to date with tech trends', '2024-12-19 17:47:53');

-- --------------------------------------------------------

--
-- Structure de la table `difficulty_levels`
--

CREATE TABLE `difficulty_levels` (
  `level_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `points` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `difficulty_levels`
--

INSERT INTO `difficulty_levels` (`level_id`, `name`, `points`, `created_at`) VALUES
(1, 'Easy', 10, '2024-12-19 17:47:53'),
(2, 'Medium', 20, '2024-12-19 17:47:53'),
(3, 'Hard', 30, '2024-12-19 17:47:53');

-- --------------------------------------------------------

--
-- Structure de la table `questions`
--

CREATE TABLE `questions` (
  `question_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `level_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `questions`
--

INSERT INTO `questions` (`question_id`, `category_id`, `level_id`, `question_text`, `created_at`) VALUES
(1, 1, 1, 'What is the capital of France?', '2024-12-19 17:47:53'),
(2, 1, 1, 'Which planet is known as the Red Planet?', '2024-12-19 17:47:53'),
(3, 1, 2, 'Who painted the Mona Lisa?', '2024-12-19 17:47:53'),
(4, 1, 3, 'What is the chemical symbol for gold?', '2024-12-19 17:47:53');

-- --------------------------------------------------------

--
-- Structure de la table `statistics`
--

CREATE TABLE `statistics` (
  `stat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_quizzes_played` int(11) DEFAULT 0,
  `total_correct_answers` int(11) DEFAULT 0,
  `total_points_earned` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `statistics`
--

INSERT INTO `statistics` (`stat_id`, `user_id`, `total_quizzes_played`, `total_correct_answers`, `total_points_earned`) VALUES
(1, 1, 5, 3, 50);

-- --------------------------------------------------------

--
-- Structure de la table `tickets`
--

CREATE TABLE `tickets` (
  `ticket_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `points_required` int(11) NOT NULL,
  `reward` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `expiration_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `tickets`
--

INSERT INTO `tickets` (`ticket_id`, `name`, `points_required`, `reward`, `quantity`, `expiration_date`, `created_at`) VALUES
(1, 'Bronze Reward', 100, 'Special Badge', 50, NULL, '2024-12-19 17:47:53'),
(2, 'Silver Reward', 250, 'Premium Access', 30, NULL, '2024-12-19 17:47:53'),
(3, 'Gold Reward', 500, 'Exclusive Content', 10, NULL, '2024-12-19 17:47:53');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `points` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `password_hash`, `points`, `created_at`) VALUES
(1, 'test_user', 'test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0, '2024-12-19 17:47:53'),
(2, 'test_user2', 'test2@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 100, '2024-12-19 17:47:53');

-- --------------------------------------------------------

--
-- Structure de la table `user_activity`
--

CREATE TABLE `user_activity` (
  `activity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `activity_data` text DEFAULT NULL,
  `activity_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `user_answers`
--

CREATE TABLE `user_answers` (
  `user_answer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_id` int(11) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `points_awarded` int(11) DEFAULT 0,
  `answered_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `user_answers`
--

INSERT INTO `user_answers` (`user_answer_id`, `user_id`, `question_id`, `answer_id`, `is_correct`, `points_awarded`, `answered_at`) VALUES
(1, 1, 1, 2, 0, -1, '2024-12-20 12:02:57'),
(2, 1, 1, 1, 1, 10, '2024-12-20 12:03:04'),
(3, 1, 1, 3, 0, 0, '2024-12-20 13:02:33'),
(4, 1, 1, 1, 1, 10, '2024-12-20 13:09:48'),
(5, 1, 2, 6, 0, 0, '2024-12-20 13:09:57'),
(6, 1, 1, 1, 1, 10, '2024-12-20 13:14:07'),
(7, 1, 2, 7, 0, 0, '2024-12-20 13:14:13');

-- --------------------------------------------------------

--
-- Structure de la table `user_tickets`
--

CREATE TABLE `user_tickets` (
  `user_ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `won_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `answers`
--
ALTER TABLE `answers`
  ADD PRIMARY KEY (`answer_id`),
  ADD KEY `idx_question_id` (`question_id`);

--
-- Index pour la table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `difficulty_levels`
--
ALTER TABLE `difficulty_levels`
  ADD PRIMARY KEY (`level_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_level_id` (`level_id`);

--
-- Index pour la table `statistics`
--
ALTER TABLE `statistics`
  ADD PRIMARY KEY (`stat_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`ticket_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `user_activity`
--
ALTER TABLE `user_activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `idx_activity_user_id` (`user_id`);

--
-- Index pour la table `user_answers`
--
ALTER TABLE `user_answers`
  ADD PRIMARY KEY (`user_answer_id`),
  ADD KEY `question_id` (`question_id`),
  ADD KEY `answer_id` (`answer_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Index pour la table `user_tickets`
--
ALTER TABLE `user_tickets`
  ADD PRIMARY KEY (`user_ticket_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `answers`
--
ALTER TABLE `answers`
  MODIFY `answer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `difficulty_levels`
--
ALTER TABLE `difficulty_levels`
  MODIFY `level_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `questions`
--
ALTER TABLE `questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `statistics`
--
ALTER TABLE `statistics`
  MODIFY `stat_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `ticket_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `user_activity`
--
ALTER TABLE `user_activity`
  MODIFY `activity_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `user_answers`
--
ALTER TABLE `user_answers`
  MODIFY `user_answer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `user_tickets`
--
ALTER TABLE `user_tickets`
  MODIFY `user_ticket_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `answers`
--
ALTER TABLE `answers`
  ADD CONSTRAINT `answers_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`level_id`) REFERENCES `difficulty_levels` (`level_id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `statistics`
--
ALTER TABLE `statistics`
  ADD CONSTRAINT `statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_activity`
--
ALTER TABLE `user_activity`
  ADD CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_answers`
--
ALTER TABLE `user_answers`
  ADD CONSTRAINT `user_answers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_answers_ibfk_3` FOREIGN KEY (`answer_id`) REFERENCES `answers` (`answer_id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_tickets`
--
ALTER TABLE `user_tickets`
  ADD CONSTRAINT `user_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_tickets_ibfk_2` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
