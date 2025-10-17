const { Course, User } = require("../data");

// Get all courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get joined users
exports.getJoinedUsers = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course.joinedUsers || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add new course
exports.addCourse = async (req, res) => {
  try {
    const courseDetails = req.body;
    const course = new Course(courseDetails);
    await course.save();
    res.status(201).json({ message: "Course added successfully", course });
  } catch (err) {
    console.error("Error adding course:", err);
    res.status(500).json({ error: "Failed to add course" });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseDetails = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(id, courseDetails, { new: true });
    if (!updatedCourse) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course updated successfully", course: updatedCourse });
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ error: "Failed to update course" });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCourse = await Course.findByIdAndDelete(id);
    if (!deletedCourse) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course deleted successfully", course: deletedCourse });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ error: "Failed to delete course" });
  }
};

// Join course
exports.joinCourse = async (req, res) => {
  try {
    const { userId, name, email } = req.body;
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const alreadyJoined = course.joinedUsers.some(u => u.userId?.toString() === userId);

    if (!alreadyJoined) {
      course.joinedUsers.push({ userId, name, email, lastJoined: new Date() })

      await course.save();
    }

    res.json({ success: true, joinedUsers: course.joinedUsers });
  } catch (err) {
    console.error("Error joining course:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Leave course
exports.leaveCourse = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });
   
    course.joinedUsers = course.joinedUsers.filter(
      u => u.userId && u.userId.toString() !== userId
    );
    await course.save();

    res.json(course.joinedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
