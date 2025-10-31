const { Course, User } = require("../data");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");


exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseName, price, courseId } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "GBP",
            product_data: {
              name: courseName,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
       payment_intent_data: {
        setup_future_usage: "off_session",
      },
      success_url: `https://madeformanners.com/success?courseId=${courseId}`,
      cancel_url: "https://madeformanners.com/payment_failed",
    });

    res.json({ url: session.url });
  } catch (err) {
    // console.error("Error creating checkout session:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserCourseStatus = async (req, res) => { 
  try {
    const {userId, userImg, courseId , key  } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const courseIndex = user.courses.findIndex(c => c._id?.toString() === courseId);
    
    if (courseIndex !== -1) {

      user.courses[courseIndex].status = key === '1' ? 'booking' : 'watched';
      

    } else {
      const courseData = {
        ...course.toObject(), 
        status: key === '1' ? 'booking' : 'watched',
      };

      user.courses.push(courseData);

    }

    await user.save();

    const array = key === '1' ? course.bookedUsers : course.joinedUsers;

   
    const alreadyUserAdded = array.some(u => u._id?.toString() === userId);

    if (!alreadyUserAdded) {
      user.img = userImg
      array.push(user);
      await course.save();
    }

    const course1 = course;
    res.json({ success: true, course1, user });
  } catch (err) {
    console.error("Error updating booked users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
