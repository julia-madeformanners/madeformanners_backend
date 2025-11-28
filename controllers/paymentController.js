const { Course, User } = require("../data");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const axios = require("axios");

// Create Stripe checkout session
// const WORLD_PAY_API = "https://apis.cert.worldpay.com/merchant/boarding/experiences/uk/v1";
// const API_KEY = process.env.WORLDPAY_API_KEY;
// const WORLDPAY_BASE = "https://try.access.worldpay.com";
// const USERNAME = "<username>"; // من حسابك Sandbox
// const PASSWORD = "<password>"; // من حسابك Sandbox

// exports.createCheckoutSession = async (req, res) => {
   
//   try {
//     const { courseName, price, courseId, userName } = req.body;

//     // Worldpay بيشتغل بالـ "أصغر وحدة" (مثلاً GBP → pence, USD → cents)
//     const amount = price;

//     const body = {
//       transactionReference: uuidv4(), // مرجع فريد للطلب
//       merchant: { entity: "default" }, // Entity ID من حسابك
//       instruction: {
//         method: "card",
//         paymentInstrument: {
//           type: "plain",
//           cardHolderName: userName || "Test User",
//           cardNumber: "4000000000001091", // رقم تجريبي
//           expiryDate: { month: 12, year: 2035 },
//           billingAddress: {
//             address1: "221B Baker Street",
//             postalCode: "SW1 1AA",
//             city: "London",
//             countryCode: "GB"
//           },
//           cvc: "123"
//         },
//         narrative: { line1: courseName },
//         value: {
//           currency: "GBP",
//           amount: amount
//         }
//       }
//     };

//     const response = await axios.post(
//       `${WORLDPAY_BASE}/api/payments`,
//       body,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "WP-Api-Version": "2024-06-01",
//           Authorization:
//             "Basic " +
//             Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")
//         }
//       }
//     );

//     // Worldpay بيعطيك النتيجة مباشرة (مو رابط URL جاهز مثل Stripe)
//     // إذا بدك تسوي redirect بعد النجاح:
//     if (response.data?.outcome === "authorized") {
//       res.json({
//         returnUrl: `http://localhost:3000/Success?courseId=${courseId}`
//       });
//     } else {
//       res.json({
//         returnUrl: `http://localhost:3000/payment-faile`
//       });
//     }
//   } catch (err) {
//     console.error(
//       "Error creating Worldpay payment:",
//       err.response?.data || err.message
//     );
//     res
//       .status(500)
//       .json({ error: err.response?.data || "Failed to create payment" });
//   }
// };

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
// exports.createCheckoutSession = async (req, res) => {
//   try {
//     const { courseName, price, courseId, userName } = req.body;

//     const data = {
//       amount: price, // بالـ smallest currency unit حسب Worldpay (مثلاً سنت)
//       currencyCode: "GBP",
//       orderDescription: courseName,
//       paymentMethod: "CARD",
//       name: userName, // يمكن تعديله حسب بيانات المستخدم
//       returnUrl: `http://localhost:3000/payment-success?courseId=${courseId}`, // بعد الدفع
//     };

//     const response = await axios.post(WORLD_PAY_API, data, {
//       headers: {
//         Authorization: `WORLDPAY license='${API_KEY}'`,
//         "Content-Type": "application/json",
//         "v-correlation-id": uuidv4() // معرف فريد للطلب
//       }
//     });

//     // Worldpay يرجع رابط الدفع في response.data.redirectUrl
//     res.json({ url: response.data.redirectUrl });
//   } catch (err) {
//     console.error("Error creating Worldpay session:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to create payment session" });
//   }
// };
// Update user course status (booking / watched)
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
        ...course.toObject(), // ينقل كل الحقول من الـ course
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
