const express = require("express");
const {
  getCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  joinCourse,
  leaveCourse,
  getJoinedUsers
} = require("../controllers/courseController");

const router = express.Router();

router.get("/", getCourses);
router.get("/:id", getCourseById);
router.get("/:courseId/joinedUsers", getJoinedUsers);

router.post("/", addCourse);
router.post("/:id/join", joinCourse);
router.post("/:id/leave", leaveCourse);

router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
