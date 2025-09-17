const Society = require("../../models/SocietySchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signupSociety = async (req, res) => {
  try {
    const { username, email, password, buildingName, address, residentsCount } =
      req.body;

    // 🔐 Check if email already exists
    const existing = await Society.findOne({ email });
    if (existing)
      return res.status(400).json({ msg: "Society already exists" });

    // 🔐 Check if username already exists
    const existingUsername = await Society.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ msg: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newSociety = new Society({
      username,
      email,
      password: hashed,
      buildingName,
      address,
      residentsCount,
    });
    console.log("Saving Society:", newSociety);
    await newSociety.save();

    const token = jwt.sign(
      { id: newSociety._id, role: newSociety.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res
      .status(201)
      .json({ msg: "Society registered successfully", authToken: token });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.loginSociety = async (req, res) => {
  try {
    const { email, password } = req.body;
    const society = await Society.findOne({ email });
    if (!society) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, society.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: society._id, role: society.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token, role: society.role });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
